import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";

interface GarantiaRelatorio {
  os_numero: number;
  os_id: string;
  cliente_nome: string;
  data_original: string;
  total_retornos: number;
  ultima_garantia: string;
}

export default function RelatorioGarantias() {
  const [garantias, setGarantias] = useState<GarantiaRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    fetchGarantias();
  }, []);

  const fetchGarantias = async () => {
    try {
      setLoading(true);

      // Buscar todas as ordens que têm garantias vinculadas
      const { data: ordensOriginais, error: ordensError } = await supabase
        .from("ordens_servico")
        .select(`
          id,
          numero,
          created_at,
          clientes(nome)
        `)
        .not("id", "is", null);

      if (ordensError) throw ordensError;

      // Para cada OS, contar quantas garantias ela tem
      const garantiasPromises = ordensOriginais?.map(async (os) => {
        const { data: garantiasCount, error: countError } = await supabase
          .from("ordens_servico")
          .select("id, created_at", { count: "exact" })
          .eq("os_original_id", os.id)
          .eq("eh_garantia", true)
          .order("created_at", { ascending: false });

        if (countError) throw countError;

        return {
          os_numero: os.numero,
          os_id: os.id,
          cliente_nome: (os.clientes as any)?.nome || "N/A",
          data_original: os.created_at,
          total_retornos: garantiasCount?.length || 0,
          ultima_garantia: garantiasCount && garantiasCount.length > 0 ? garantiasCount[0].created_at : "",
        };
      }) || [];

      const result = await Promise.all(garantiasPromises);
      
      // Filtrar apenas as que têm retornos
      const comRetornos = result.filter(g => g.total_retornos > 0);
      
      setGarantias(comRetornos);
    } catch (error: any) {
      console.error("Erro ao buscar garantias:", error);
      toast.error("Erro ao carregar relatório de garantias");
    } finally {
      setLoading(false);
    }
  };

  const filteredGarantias = garantias.filter(g => {
    const matchSearch = 
      searchTerm === "" ||
      g.os_numero.toString().includes(searchTerm) ||
      g.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDataInicio = 
      dataInicio === "" ||
      new Date(g.data_original) >= new Date(dataInicio);

    const matchDataFim = 
      dataFim === "" ||
      new Date(g.data_original) <= new Date(dataFim);

    return matchSearch && matchDataInicio && matchDataFim;
  });

  const totalRetornos = filteredGarantias.reduce((acc, g) => acc + g.total_retornos, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Relatório de Garantias e Retornos
        </CardTitle>
        <CardDescription>
          Histórico de ordens de serviço com retornos em garantia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nº OS ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filteredGarantias.length}</div>
              <p className="text-sm text-muted-foreground">OS com Retornos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalRetornos}</div>
              <p className="text-sm text-muted-foreground">Total de Retornos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredGarantias.length > 0 
                  ? (totalRetornos / filteredGarantias.length).toFixed(1)
                  : "0"}
              </div>
              <p className="text-sm text-muted-foreground">Média de Retornos/OS</p>
            </CardContent>
          </Card>
        </div>

        <Button onClick={fetchGarantias} variant="outline" className="w-full">
          Atualizar Relatório
        </Button>

        {/* Tabela */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : filteredGarantias.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum retorno encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>O.S. Original</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Original</TableHead>
                  <TableHead>Total Retornos</TableHead>
                  <TableHead>Último Retorno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGarantias.map((garantia) => (
                  <TableRow key={garantia.os_id}>
                    <TableCell className="font-medium">
                      #{garantia.os_numero}
                    </TableCell>
                    <TableCell>{garantia.cliente_nome}</TableCell>
                    <TableCell>
                      {new Date(garantia.data_original).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {garantia.total_retornos} retorno{garantia.total_retornos > 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {garantia.ultima_garantia
                        ? new Date(garantia.ultima_garantia).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
