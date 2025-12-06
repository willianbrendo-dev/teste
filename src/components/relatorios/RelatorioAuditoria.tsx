import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Download, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
  ip_address: any;
  user_agent: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  nome: string | null;
}

const RelatorioAuditoria = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    user_id: "",
    action: "",
    table_name: "",
    data_inicio: "",
    data_fim: "",
  });

  useEffect(() => {
    loadData();

    // Configurar realtime para audit_logs
    const channel = supabase
      .channel('audit_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('Novo log recebido:', payload);
          if (payload.eventType === 'INSERT') {
            setLogs(prev => [payload.new as AuditLog, ...prev].slice(0, 100));
            toast.info('Nova ação registrada no sistema', {
              description: `${getActionDescription((payload.new as AuditLog).action)} em ${getTableDescription((payload.new as AuditLog).table_name)}`
            });
          } else if (payload.eventType === 'UPDATE') {
            setLogs(prev => prev.map(log => 
              log.id === (payload.new as AuditLog).id ? payload.new as AuditLog : log
            ));
          } else if (payload.eventType === 'DELETE') {
            setLogs(prev => prev.filter(log => log.id !== (payload.old as AuditLog).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([fetchLogs(), fetchUsers()]);
    setLoading(false);
  };

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters.user_id) {
        query = query.eq("user_id", filters.user_id);
      }
      if (filters.action) {
        query = query.eq("action", filters.action);
      }
      if (filters.table_name) {
        query = query.eq("table_name", filters.table_name);
      }
      if (filters.data_inicio) {
        query = query.gte("created_at", filters.data_inicio + "T00:00:00");
      }
      if (filters.data_fim) {
        query = query.lte("created_at", filters.data_fim + "T23:59:59");
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar logs: " + error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, nome")
        .order("email");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const applyFilters = () => {
    setFilterOpen(false);
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      user_id: "",
      action: "",
      table_name: "",
      data_inicio: "",
      data_fim: "",
    });
    setFilterOpen(false);
    fetchLogs();
  };

  const getActionDescription = (action: string) => {
    const actions: Record<string, string> = {
      INSERT: "Criação",
      UPDATE: "Atualização",
      DELETE: "Exclusão",
    };
    return actions[action] || action;
  };

  const getTableDescription = (tableName: string) => {
    const tables: Record<string, string> = {
      clientes: "Clientes",
      ordens_servico: "Ordens de Serviço",
      pecas_estoque: "Estoque de Peças",
      garantias: "Garantias",
      checklists: "Checklists",
      transacoes: "Transações Financeiras",
      caixa_diario: "Caixa Diário",
      marcas: "Marcas",
      modelos: "Modelos",
      categorias_financeiras: "Categorias Financeiras",
      profiles: "Perfis de Usuário",
      user_roles: "Funções de Usuário",
      user_permissions: "Permissões de Usuário",
    };
    return tables[tableName] || tableName;
  };

  const getChangeSummary = (log: AuditLog) => {
    if (log.action === "INSERT") {
      return "Novo registro criado";
    }
    if (log.action === "DELETE") {
      return "Registro excluído";
    }
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const changes: string[] = [];
      const oldData = log.old_data as Record<string, any>;
      const newData = log.new_data as Record<string, any>;
      
      Object.keys(newData).forEach(key => {
        if (oldData[key] !== newData[key] && !key.includes("updated_at") && !key.includes("created_at")) {
          changes.push(key);
        }
      });
      
      if (changes.length === 0) return "Atualização realizada";
      if (changes.length <= 3) {
        return `Campos alterados: ${changes.join(", ")}`;
      }
      return `${changes.length} campos alterados`;
    }
    return "Ação realizada";
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("Relatório de Auditoria do Sistema", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 30);
    doc.text(`Total de ações registradas: ${logs.length}`, 14, 36);
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 40, 196, 40);

    // Estatísticas
    const inserts = logs.filter(l => l.action === "INSERT").length;
    const updates = logs.filter(l => l.action === "UPDATE").length;
    const deletes = logs.filter(l => l.action === "DELETE").length;
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Criações: ${inserts}  |  Atualizações: ${updates}  |  Exclusões: ${deletes}`, 14, 48);

    // Tabela de dados
    const tableData = logs.map(log => {
      const user = users.find(u => u.id === log.user_id);
      return [
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        user?.nome || user?.email || "Sistema",
        getActionDescription(log.action),
        getTableDescription(log.table_name),
        getChangeSummary(log),
      ];
    });

    autoTable(doc, {
      startY: 55,
      head: [["Data/Hora", "Usuário", "Ação", "Módulo", "Descrição"]],
      body: tableData,
      styles: { 
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 14, right: 14 },
    });

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio-auditoria-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
    toast.success("Relatório PDF exportado com sucesso!");
  };

  const getUserEmail = (userId: string | null) => {
    if (!userId) return "Sistema";
    const user = users.find(u => u.id === userId);
    return user?.email || user?.nome || "Usuário desconhecido";
  };

  const getActionBadgeVariant = (action: string): "default" | "destructive" | "secondary" => {
    if (action === "DELETE") return "destructive";
    if (action === "INSERT") return "default";
    return "secondary";
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Logs do Sistema</h3>
          <p className="text-sm text-muted-foreground">
            Registros de todas as ações realizadas no sistema
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Filtrar Logs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Usuário</Label>
                  <Select
                    value={filters.user_id}
                    onValueChange={(value) => setFilters({ ...filters, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os usuários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os usuários</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ação</Label>
                  <Select
                    value={filters.action}
                    onValueChange={(value) => setFilters({ ...filters, action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as ações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as ações</SelectItem>
                      <SelectItem value="INSERT">INSERT</SelectItem>
                      <SelectItem value="UPDATE">UPDATE</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tabela</Label>
                  <Input
                    placeholder="Nome da tabela"
                    value={filters.table_name}
                    onChange={(e) => setFilters({ ...filters, table_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={filters.data_inicio}
                      onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={filters.data_fim}
                      onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="flex-1">
                    Aplicar Filtros
                  </Button>
                  <Button onClick={clearFilters} variant="outline" className="flex-1">
                    Limpar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={exportToPDF} size="sm" className="flex-1 sm:flex-initial">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Auditoria</CardTitle>
          <CardDescription>
            {logs.length > 0
              ? `${logs.length} registro(s) encontrado(s)`
              : "Nenhum registro encontrado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum log de auditoria encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>{getUserEmail(log.user_id)}</TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {getActionDescription(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getTableDescription(log.table_name)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getChangeSummary(log)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p className="font-medium">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Usuário</Label>
                  <p className="font-medium">{getUserEmail(selectedLog.user_id)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ação</Label>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {getActionDescription(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Módulo</Label>
                  <p className="font-medium">{getTableDescription(selectedLog.table_name)}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="font-medium">{getChangeSummary(selectedLog)}</p>
                </div>
              </div>

              {selectedLog.action === "UPDATE" && selectedLog.old_data && selectedLog.new_data && (
                <div>
                  <Label className="text-muted-foreground mb-3 block">Alterações Realizadas</Label>
                  <div className="space-y-2">
                    {Object.keys(selectedLog.new_data as Record<string, any>).map((key) => {
                      const oldData = selectedLog.old_data as Record<string, any>;
                      const newData = selectedLog.new_data as Record<string, any>;
                      
                      if (oldData[key] === newData[key] || key.includes("updated_at") || key.includes("created_at")) {
                        return null;
                      }
                      
                      return (
                        <div key={key} className="bg-muted p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1 capitalize">
                            {key.replace(/_/g, " ")}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Antes: </span>
                              <span className="text-destructive line-through">
                                {oldData[key]?.toString() || "vazio"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Depois: </span>
                              <span className="text-primary font-medium">
                                {newData[key]?.toString() || "vazio"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedLog.action === "INSERT" && selectedLog.new_data && (
                <div>
                  <Label className="text-muted-foreground mb-3 block">Dados Criados</Label>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    {Object.entries(selectedLog.new_data as Record<string, any>).map(([key, value]) => {
                      if (key.includes("id") || key.includes("created_at") || key.includes("updated_at")) {
                        return null;
                      }
                      return (
                        <div key={key} className="text-sm">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:{" "}
                          </span>
                          <span className="font-medium">{value?.toString() || "não informado"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedLog.action === "DELETE" && selectedLog.old_data && (
                <div>
                  <Label className="text-muted-foreground mb-3 block">Dados Excluídos</Label>
                  <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg space-y-1">
                    {Object.entries(selectedLog.old_data as Record<string, any>).map(([key, value]) => {
                      if (key.includes("id") || key.includes("created_at") || key.includes("updated_at")) {
                        return null;
                      }
                      return (
                        <div key={key} className="text-sm">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:{" "}
                          </span>
                          <span className="font-medium">{value?.toString() || "não informado"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RelatorioAuditoria;
