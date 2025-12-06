import { format, parseISO } from "date-fns";

interface Cliente {
  nome: string;
  telefone?: string | null;
  endereco?: string | null;
}

interface Marca {
  nome: string;
}

interface Modelo {
  nome: string;
}

interface OrdemServicoData {
  numero: number;
  created_at: string;
  cliente_id: string;
  clientes?: Cliente | null;
  marcas?: Marca | null;
  modelos?: Modelo | null;
  numero_serie?: string | null;
  cor_aparelho?: string | null;
  senha_aparelho?: string | null;
  tipo_senha?: string | null;
  descricao_problema?: string | null;
  estado_fisico?: string | null;
  servico_realizar?: string | null;
  observacoes?: string | null;
  data_prevista_entrega?: string | null;
  valor_estimado?: number | null;
  valor_entrada?: number | null;
  valor_total?: number | null;
}

interface OrdemServicoDocumentProps {
  ordem: OrdemServicoData;
  forPrint?: boolean;
}

export function OrdemServicoDocument({ ordem, forPrint = false }: OrdemServicoDocumentProps) {
  const valorRestante = ((ordem.valor_total || ordem.valor_estimado || 0) - (ordem.valor_entrada || 0)).toFixed(2);

  return (
    <div className={`bg-white text-black ${forPrint ? 'print-document' : ''}`}>
      <style>{`
        @media print {
          .print-document {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            margin: 0 auto;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        .os-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          font-family: Arial, sans-serif;
        }
        
        .os-table td, .os-table th {
          border: 1px solid #000;
          padding: 4px 6px;
        }
        
        .os-label {
          font-weight: bold;
          background-color: #f5f5f5;
          text-transform: uppercase;
          font-size: 10px;
          white-space: nowrap;
        }
        
        .os-value {
          color: #d32f2f;
          font-weight: 600;
          font-size: 11px;
        }
        
        .os-header {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          padding: 8px;
          background-color: #f5f5f5;
        }
        
        .os-section-full {
          padding: 6px;
          min-height: 40px;
        }
      `}</style>

      <table className="os-table">
        {/* Cabeçalho */}
        <tr>
          <td colSpan={4} className="os-header">
            TECNOBOOK INFORMATICA<br/>
            RUA 15 DE NOVEMBRO S/N
          </td>
        </tr>
        
        {/* CNPJ e Contato */}
        <tr>
          <td colSpan={2} className="os-label">209109420001-14</td>
          <td colSpan={2} className="os-label">NÚMERO DE CONTATO</td>
        </tr>
        
        {/* Data e Número da OS */}
        <tr>
          <td colSpan={2} className="os-label">
            DATA E HORA DA EMISSÃO DA NOTA: {format(new Date(ordem.created_at), "dd/MM/yyyy 'ÀS' HH:mm")}
          </td>
          <td colSpan={2}></td>
        </tr>
        
        <tr>
          <td colSpan={2} className="os-label">ORDEM DE SERVIÇO: VIA ESTABELECIMENTO</td>
          <td colSpan={2} className="os-label">Nº ORDEM DE SERVIÇO: <span className="os-value">{ordem.numero}</span></td>
        </tr>
        
        {/* Informações do Cliente */}
        <tr>
          <td className="os-label">NOME COMPLETO:</td>
          <td colSpan={2} className="os-value">{ordem.clientes?.nome || "N/A"}</td>
          <td className="os-label">APELIDO</td>
        </tr>
        
        <tr>
          <td className="os-label">ENDEREÇO:</td>
          <td className="os-value">{ordem.clientes?.endereco || "N/A"}</td>
          <td className="os-label">BAIRRO:</td>
          <td className="os-value"></td>
        </tr>
        
        <tr>
          <td className="os-label">CPF:</td>
          <td className="os-value"></td>
          <td className="os-label">TEL:</td>
          <td className="os-value">{ordem.clientes?.telefone || "N/A"}</td>
        </tr>
        
        {/* Informações do Aparelho */}
        <tr>
          <td className="os-label">APARELHO:</td>
          <td className="os-value">CELULAR</td>
          <td className="os-label">COR:</td>
          <td className="os-value">{ordem.cor_aparelho || "N/A"}</td>
        </tr>
        
        <tr>
          <td className="os-label">MARCA</td>
          <td className="os-value">{ordem.marcas?.nome || "N/A"}</td>
          <td className="os-label">MODELO</td>
          <td className="os-value">{ordem.modelos?.nome || "N/A"}</td>
        </tr>
        
        <tr>
          <td colSpan={4} className="os-label">NUM. SERIE/ IMEI: <span className="os-value">{ordem.numero_serie || "N/A"}</span></td>
        </tr>
        
        <tr>
          <td className="os-label">SENHA:</td>
          <td className="os-value" colSpan={3}>
            {ordem.tipo_senha === 'PADRAO' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>DESENHE O PADRÃO DE DESBLOQUEIO:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 20px)', gap: '15px', justifyContent: 'center' }}>
                  {[...Array(9)].map((_, i) => (
                    <div key={i} style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid #000', 
                      borderRadius: '50%' 
                    }} />
                  ))}
                </div>
              </div>
            ) : ordem.tipo_senha === 'LIVRE' ? (
              ordem.senha_aparelho || "N/A"
            ) : (
              "N/A"
            )}
          </td>
        </tr>
        
        {/* Estado Físico */}
        <tr>
          <td className="os-label" style={{ verticalAlign: 'top' }}>ESTADO FÍSICO DO APARELHO</td>
          <td colSpan={3} className="os-section-full os-value">
            {ordem.estado_fisico || "N/A"}
          </td>
        </tr>
        
        {/* Relato do Cliente */}
        <tr>
          <td className="os-label" style={{ verticalAlign: 'top' }}>RELATO DO CLIENTE</td>
          <td colSpan={3} className="os-section-full os-value">
            {ordem.descricao_problema || "N/A"}
          </td>
        </tr>
        
        {/* Possível Reparo */}
        <tr>
          <td className="os-label" style={{ verticalAlign: 'top' }}>POSSÍVEL REPARO</td>
          <td colSpan={3} className="os-section-full os-value">
            {ordem.servico_realizar || "N/A"}
          </td>
        </tr>
        
        {/* Observações */}
        <tr>
          <td className="os-label" style={{ verticalAlign: 'top' }}>OBS:</td>
          <td colSpan={3} className="os-section-full os-value">
            {ordem.observacoes || "N/A"}
          </td>
        </tr>
        
        {/* Datas */}
        <tr>
          <td className="os-label">DATA DE ENTRADA</td>
          <td colSpan={3} className="os-value">
            {format(parseISO(ordem.created_at), "dd/MM/yyyy 'ÀS' HH:mm")}
          </td>
        </tr>
        
        <tr>
          <td className="os-label">DATA PREVISTA PARA ENTREGA</td>
          <td colSpan={3} className="os-value">
            {ordem.data_prevista_entrega 
              ? format(parseISO(ordem.data_prevista_entrega), "dd/MM/yyyy 'ÀS' HH:mm")
              : "A COMBINAR"}
          </td>
        </tr>
        
        {/* Valores */}
        <tr>
          <td colSpan={2} className="os-label">VALOR DO SERVIÇO:</td>
          <td colSpan={2} className="os-value">
            R$ {(ordem.valor_total || ordem.valor_estimado || 0).toFixed(2)}
          </td>
        </tr>
        
        <tr>
          <td colSpan={2} className="os-label">VALOR DO ADIANTAMENTO</td>
          <td colSpan={2} className="os-value">
            R$ {(ordem.valor_entrada || 0).toFixed(2)}
          </td>
        </tr>
        
        <tr>
          <td colSpan={2} className="os-label">VALOR A SER RECEBIDO</td>
          <td colSpan={2} className="os-value">
            R$ {valorRestante}
          </td>
        </tr>
      </table>
    </div>
  );
}
