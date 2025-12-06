import { ComboboxSelect } from "@/components/ui/combobox-select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import RelatorioFinanceiro from "./relatorios/RelatorioFinanceiro";
import RelatorioCaixaDia from "./relatorios/RelatorioCaixaDia";
import RelatorioComparativoCaixas from "./relatorios/RelatorioComparativoCaixas";
import RelatorioColaborador from "./relatorios/RelatorioColaborador";
import RelatorioServicos from "./relatorios/RelatorioServicos";
import RelatorioEstoque from "./relatorios/RelatorioEstoque";
import RelatorioComparativoAtendentes from "./relatorios/RelatorioComparativoAtendentes";
import RelatorioEntregas from "./relatorios/RelatorioEntregas";

const RelatoriosFinanceiros = () => {
  const [tipoRelatorio, setTipoRelatorio] = useState("financeiro");

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Label>Tipo de Relatório</Label>
        <ComboboxSelect
          value={tipoRelatorio}
          onValueChange={setTipoRelatorio}
          options={[
            { value: "financeiro", label: "Relatório Financeiro" },
            { value: "caixa_dia", label: "Movimentação do Caixa do Dia" },
            { value: "comparativo_caixas", label: "Comparativo de Caixas (Atendentes)" },
            { value: "colaborador", label: "Relatório de Colaborador" },
            { value: "comparativo_atendentes", label: "Análise Comparativa de Atendentes" },
            { value: "servicos", label: "Relatório de Serviços" },
            { value: "entregas", label: "Relatório de Entregas" },
            { value: "estoque", label: "Relatório de Estoque" },
          ]}
          allowCustom={false}
        />
      </div>

      {tipoRelatorio === "financeiro" && <RelatorioFinanceiro />}
      {tipoRelatorio === "caixa_dia" && <RelatorioCaixaDia />}
      {tipoRelatorio === "comparativo_caixas" && <RelatorioComparativoCaixas />}
      {tipoRelatorio === "colaborador" && <RelatorioColaborador />}
      {tipoRelatorio === "comparativo_atendentes" && <RelatorioComparativoAtendentes />}
      {tipoRelatorio === "servicos" && <RelatorioServicos />}
      {tipoRelatorio === "entregas" && <RelatorioEntregas />}
      {tipoRelatorio === "estoque" && <RelatorioEstoque />}
    </div>
  );
};

export default RelatoriosFinanceiros;
