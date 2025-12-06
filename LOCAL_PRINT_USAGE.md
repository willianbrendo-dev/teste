# Guia de Uso: Impressão Local

## Visão Geral

O sistema de impressão local permite que Admin e Atendente imprimam diretamente via OTG (Android), USB (Chrome/Edge) ou rede Wi-Fi, **sem necessidade de usuário Print Bridge dedicado**.

## Arquitetura

### Componentes Principais

1. **`LocalPrintService`** (`src/lib/printer/local-print-service.ts`)
   - Serviço unificado de impressão
   - Suporta OTG, USB e Network
   - Reutiliza toda a lógica ESC/POS existente

2. **`useLocalPrint`** (`src/hooks/use-local-print.ts`)
   - Hook React para gerenciar impressão
   - Estados visuais e feedback
   - Fácil integração em componentes

3. **`PrintButton`** (`src/components/PrintButton.tsx`)
   - Componente de botão com estados visuais
   - Suporta impressão local e remota

## Configuração

### 1. Configurar Impressora

Acesse **Configurações > Impressora** e:

#### Opção A: OTG (Android - Recomendado)
1. Conecte impressora Bematech MP-4200 TH no adaptador OTG
2. Conecte adaptador no celular/tablet
3. Clique em "Conectar Impressora OTG"
4. Permita acesso USB
5. Salve a configuração

#### Opção B: USB (PC/Notebook)
1. Conecte impressora na porta USB
2. Abra no Chrome ou Edge
3. Clique em "Conectar Impressora USB"
4. Selecione a impressora
5. Salve a configuração

#### Opção C: Network (Wi-Fi)
1. Conecte impressora na mesma rede Wi-Fi
2. Digite o IP da impressora
3. Teste conexão
4. Salve a configuração

### 2. Testar Impressão

Clique em "Teste de Impressão" para validar.

## Uso em Componentes

### Exemplo Básico

\`\`\`tsx
import { useLocalPrint } from '@/hooks/use-local-print';
import { PrintButton } from '@/components/PrintButton';

function MyComponent() {
  const { 
    printServiceOrder, 
    status, 
    isConfigured 
  } = useLocalPrint();

  const handlePrint = async () => {
    const result = await printServiceOrder(ordemServico, checklist);
    if (result.success) {
      console.log('Impressão enviada!');
    }
  };

  return (
    <PrintButton
      onClick={handlePrint}
      status={status}
      disabled={!isConfigured()}
      mode="local"
    />
  );
}
\`\`\`

### Imprimir Ordem de Serviço

\`\`\`tsx
const { printServiceOrder, status } = useLocalPrint();

const handlePrint = async () => {
  await printServiceOrder(ordem, checklist);
};
\`\`\`

### Imprimir Checklist

\`\`\`tsx
const { printChecklist, status } = useLocalPrint();

const handlePrint = async () => {
  await printChecklist(checklist);
};
\`\`\`

### Imprimir Recibo Customizado

\`\`\`tsx
const { printCustomReceipt, status } = useLocalPrint();

const handlePrint = async () => {
  await printCustomReceipt([
    { text: 'MINHA EMPRESA', align: 'center', bold: true, doubleSize: true },
    { text: 'Recibo de Pagamento', align: 'center' },
    { text: '================================', align: 'center' },
    { text: '' },
    { text: 'Valor: R$ 100,00', align: 'right', bold: true },
  ]);
};
\`\`\`

## Hook useLocalPrint - API Completa

### Estado

\`\`\`tsx
const {
  status,        // 'idle' | 'printing' | 'success' | 'error'
  error,         // string | null
  isPrinting,    // boolean
  isSuccess,     // boolean
  isError,       // boolean
} = useLocalPrint();
\`\`\`

### Funções

\`\`\`tsx
const {
  isConfigured,          // () => boolean
  getPrinterStatus,      // () => Promise<PrinterStatus>
  testPrint,             // (companyName?) => Promise<LocalPrintResult>
  printServiceOrder,     // (ordem, checklist?) => Promise<LocalPrintResult>
  printChecklist,        // (checklist) => Promise<LocalPrintResult>
  printCustomReceipt,    // (lines) => Promise<LocalPrintResult>
  reset,                 // () => void
} = useLocalPrint();
\`\`\`

## Integração com Código Existente

### Manter Impressão Remota

O sistema **mantém compatibilidade** com impressão remota (Print Bridge):

\`\`\`tsx
import { useRemotePrint } from '@/hooks/use-remote-print';
import { useLocalPrint } from '@/hooks/use-local-print';

function MyComponent() {
  const remotePrint = useRemotePrint();
  const localPrint = useLocalPrint();

  const handlePrintRemote = async () => {
    // Impressão via Print Bridge (antigo)
    await remotePrint.printServiceOrder(ordem);
  };

  const handlePrintLocal = async () => {
    // Impressão local (novo)
    await localPrint.printServiceOrder(ordem);
  };

  return (
    <>
      <PrintButton onClick={handlePrintRemote} status={remotePrint.status} mode="remote" />
      <PrintButton onClick={handlePrintLocal} status={localPrint.status} mode="local" />
    </>
  );
}
\`\`\`

## Geradores ESC/POS Reutilizados

O sistema **reutiliza 100%** dos geradores ESC/POS existentes:

- `generateOrdemServicoESCPOS()` - Ordens de Serviço
- `generateChecklistESCPOS()` - Checklists
- `BematechCommands` - Comandos Bematech
- `escposPrinter.buildReceipt()` - Recibos customizados

**Nenhum código ESC/POS foi reescrito.**

## Fluxo de Impressão

### Impressão Local (Novo)

1. Admin/Atendente clica em "Imprimir"
2. `useLocalPrint.printServiceOrder()` é chamado
3. `LocalPrintService` gera dados ESC/POS com geradores existentes
4. Dados são enviados diretamente para impressora via OTG/USB/Network
5. **Impressão instantânea - sem fila**

### Impressão Remota (Antigo - Mantido)

1. Admin clica em "Imprimir"
2. Job é criado na tabela `print_jobs`
3. Print Bridge user recebe job via realtime
4. Print Bridge imprime via OTG
5. Status é atualizado

## Vantagens da Impressão Local

✅ **Sem usuário dedicado** - Admin/Atendente imprimem diretamente
✅ **Instantânea** - Sem fila, sem espera
✅ **Mesma qualidade** - Usa os mesmos geradores ESC/POS
✅ **Multi-plataforma** - OTG (Android), USB (PC), Network (Wi-Fi)
✅ **Código existente** - Reutiliza 100% da lógica de impressão

## Troubleshooting

### Impressora não conecta (OTG)

- Verifique se o adaptador OTG está funcionando
- Reinicie o app
- Permita acesso USB nas configurações do Android

### Impressora não conecta (USB)

- Use Chrome ou Edge
- Acesse via HTTPS ou localhost
- Verifique se o cabo USB está OK

### Impressora não conecta (Network)

- Verifique se está na mesma rede Wi-Fi
- Confirme o IP da impressora
- Teste ping no IP

### Nada imprime

- Verifique se impressora está ligada
- Teste com "Teste de Impressão"
- Veja console do navegador para erros
- Confirme que configuração foi salva

## Exemplo Completo: ChecklistsContent

\`\`\`tsx
import { useLocalPrint } from '@/hooks/use-local-print';
import { PrintButton } from '@/components/PrintButton';

export function ChecklistsContent() {
  const { printChecklist, status, isConfigured } = useLocalPrint();

  const handlePrintLocal = async (checklist: any) => {
    const result = await printChecklist(checklist);
    if (result.success) {
      console.log('Checklist impresso com sucesso');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist #{checklist.id}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* ... conteúdo do checklist ... */}
        
        <PrintButton
          onClick={() => handlePrintLocal(checklist)}
          status={status}
          disabled={!isConfigured()}
          mode="local"
        />
      </CardContent>
    </Card>
  );
}
\`\`\`

## Conclusão

O sistema de impressão local está **totalmente integrado**, permitindo que Admin e Atendente imprimam diretamente sem necessidade de Print Bridge dedicado, mantendo **100% de compatibilidade** com o código existente.
