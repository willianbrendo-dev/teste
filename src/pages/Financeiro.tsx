import MovimentacaoCaixa from "@/components/MovimentacaoCaixa";
import CategoriasFinanceiras from "@/components/CategoriasFinanceiras";
import GestaCaixaDiario from "@/components/GestaCaixaDiario";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Tags } from "lucide-react";
import { useState } from "react";

const Financeiro = () => {
  const [caixaDiarioOpen, setCaixaDiarioOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle de caixa e movimentações</p>
        </div>
      </div>

      {/* Componente Principal de Movimentação */}
      <MovimentacaoCaixa />

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Dialog open={caixaDiarioOpen} onOpenChange={setCaixaDiarioOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" size="lg">
              <FileText className="mr-2 h-4 w-4" />
              Gestão de Caixa Diário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestão de Caixa Diário</DialogTitle>
            </DialogHeader>
            <GestaCaixaDiario />
          </DialogContent>
        </Dialog>

        <Dialog open={categoriasOpen} onOpenChange={setCategoriasOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" size="lg">
              <Tags className="mr-2 h-4 w-4" />
              Gerenciar Categorias
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <CategoriasFinanceiras />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Financeiro;
