# Sistema de Comunicação em Tempo Real - Print Bridge

## Visão Geral

Sistema de comunicação bidirecional em tempo real entre dispositivos PRINT_BRIDGE e administradores usando Supabase Realtime.

## Arquitetura

```
┌─────────────────┐          ┌──────────────────┐          ┌─────────────────┐
│  Admin Panel    │          │  Supabase Cloud  │          │  Print Bridge   │
│  (Web/Mobile)   │◄────────►│  Realtime API    │◄────────►│  Device (OTG)   │
└─────────────────┘          └──────────────────┘          └─────────────────┘
      Envia jobs                Broadcast                    Executa impressão
      Recebe status             Channel                      Envia resposta
```

## Componentes

### 1. PrintBridgeRealtime (Cliente - Dispositivo Ponte)

**Arquivo:** `src/lib/printer/print-bridge-realtime.ts`

Responsabilidades:
- ✅ Conectar ao canal Supabase Realtime
- ✅ Registrar presença do dispositivo
- ✅ Escutar comandos de impressão
- ✅ Executar impressões via OTG/WebUSB
- ✅ Enviar confirmação de status
- ✅ Reconexão automática
- ✅ Logs locais persistentes

### 2. PrintBridgeAdmin (Servidor - Administradores)

**Arquivo:** `src/lib/printer/print-bridge-admin.ts`

Responsabilidades:
- ✅ Enviar trabalhos de impressão
- ✅ Gerar recibos ESC/POS automaticamente
- ✅ Escutar respostas dos dispositivos
- ✅ Suporte a múltiplos tipos de documentos

### 3. UI Integration

**Arquivo:** `src/pages/PrintBridge.tsx`

Interface do usuário mostrando:
- ✅ Status da conexão com backend
- ✅ Status da impressora OTG/USB
- ✅ Logs de trabalhos recebidos
- ✅ Indicadores visuais de reconexão

## Protocolo de Comunicação

### Registro de Dispositivo

Quando um dispositivo PRINT_BRIDGE conecta:

```typescript
{
  role: "PRINT_BRIDGE",
  action: "online",
  deviceId: "device_1234567890_abc123",
  timestamp: 1234567890123,
  deviceInfo: "Samsung Galaxy A52 (VID:1155 PID:8192)"
}
```

### Comando de Impressão (Admin → Dispositivo)

```typescript
{
  jobId: "job_1234567890_xyz789",
  action: "print",
  escposDataBase64: "G0BeS...", // Dados ESC/POS em base64
  documentType: "service_order",
  metadata: {
    ordemId: "uuid-da-ordem",
    description: "O.S #1234 - Cliente João Silva"
  }
}
```

### Resposta de Status (Dispositivo → Admin)

```typescript
{
  jobId: "job_1234567890_xyz789",
  status: "OK",  // ou "ERROR"
  timestamp: 1234567890123,
  deviceId: "device_1234567890_abc123",
  error?: "Mensagem de erro (opcional)"
}
```

## Fluxo de Trabalho

### 1. Inicialização do Dispositivo Ponte

```typescript
// Automaticamente feito no PrintBridge.tsx
const realtimeService = new PrintBridgeRealtime(
  deviceId,
  isNativeMode,
  {
    onJobReceived: (job) => {
      console.log('Job recebido:', job);
      // Atualiza UI
    },
    onStatusChange: (status) => {
      console.log('Status:', status);
      // Atualiza indicadores
    }
  }
);

await realtimeService.connect();
```

### 2. Envio de Trabalho pelo Admin

```typescript
import { sendPrintJobToDevices } from '@/lib/printer/print-bridge-admin';

// Exemplo 1: Imprimir ordem de serviço
const result = await sendPrintJobToDevices({
  documentType: 'service_order',
  ordemServico: ordemData,
  metadata: {
    ordemId: ordem.id,
    description: `O.S #${ordem.numero}`
  }
});

// Exemplo 2: Imprimir recibo customizado
const result = await sendPrintJobToDevices({
  documentType: 'custom',
  customReceipt: [
    { text: 'RECIBO PERSONALIZADO', align: 'center', bold: true },
    { text: '================================', align: 'center' },
    { text: 'Item 1: R$ 50,00', align: 'left' },
    { text: 'Item 2: R$ 30,00', align: 'left' },
    { text: '================================', align: 'center' },
    { text: 'TOTAL: R$ 80,00', align: 'right', bold: true }
  ]
});

console.log('Job enviado:', result.jobId);
```

### 3. Escutar Respostas dos Dispositivos

```typescript
import { listenToPrintJobResponses } from '@/lib/printer/print-bridge-admin';

const unsubscribe = listenToPrintJobResponses((response) => {
  if (response.status === 'OK') {
    console.log(`Job ${response.jobId} impresso com sucesso por ${response.deviceId}`);
  } else {
    console.error(`Erro no job ${response.jobId}:`, response.error);
  }
});

// Cleanup quando não precisar mais
// unsubscribe();
```

## Recursos Implementados

### ✅ Conexão Automática
- Conecta ao canal Realtime ao fazer login
- Registra dispositivo automaticamente
- Atualiza status de presença

### ✅ Reconexão Automática
- Tenta reconectar em caso de falha
- Backoff exponencial (2s, 4s, 8s, ...)
- Máximo de 10 tentativas
- Indicador visual de reconexão

### ✅ Processamento de Jobs
- Recebe comandos via broadcast
- Decodifica base64 → Uint8Array
- Envia para impressora (OTG ou WebUSB)
- Retorna status de sucesso/erro

### ✅ Logs Persistentes
- Armazena últimos 100 jobs no localStorage
- Inclui timestamp, status, metadata
- Exportável para análise

### ✅ Multi-Dispositivo
- Suporte a múltiplos dispositivos simultâneos
- Cada dispositivo tem ID único
- Broadcast envia para todos conectados

### ✅ Tipos de Documentos
- `service_order` - Ordem de serviço
- `checklist` - Checklist técnico
- `receipt` - Recibo genérico
- `custom` - Recibo customizado

## Segurança

### RLS (Row Level Security)
Por padrão, Supabase Realtime não requer RLS para broadcast channels, mas você pode implementar autenticação customizada:

```typescript
// Verifica role do usuário antes de enviar
const { data: { user } } = await supabase.auth.getUser();
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (roles.role !== 'admin') {
  throw new Error('Apenas admins podem enviar jobs');
}
```

### Device ID
- Gerado automaticamente no primeiro uso
- Armazenado em localStorage
- Único por dispositivo/navegador

## Monitoramento

### Logs do Dispositivo

```typescript
// Obter logs salvos
const logs = PrintBridgeRealtime.getJobLogs();
console.log('Últimos jobs:', logs);

// Limpar logs
PrintBridgeRealtime.clearJobLogs();
```

### Status da Conexão

```typescript
const status = realtimeService.getStatus();
console.log('Conectado:', status.connected);
console.log('Device ID:', status.deviceId);
console.log('Tentativas de reconexão:', status.reconnectAttempts);
```

## Exemplo Completo: Página Admin

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { sendPrintJobToDevices, listenToPrintJobResponses } from '@/lib/printer/print-bridge-admin';

export default function AdminPrintControl() {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    // Escuta respostas
    const unsubscribe = listenToPrintJobResponses((response) => {
      setResponses(prev => [...prev, response]);
    });

    return unsubscribe;
  }, []);

  const handlePrintOS = async (ordem) => {
    const result = await sendPrintJobToDevices({
      documentType: 'service_order',
      ordemServico: ordem,
      metadata: {
        ordemId: ordem.id,
        description: `O.S #${ordem.numero}`
      }
    });

    if (result.success) {
      toast({ title: 'Job enviado', description: `ID: ${result.jobId}` });
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div>
      <h2>Controle de Impressão Remota</h2>
      
      <Button onClick={() => handlePrintOS(ordemSelecionada)}>
        Imprimir O.S Remotamente
      </Button>

      <div>
        <h3>Respostas dos Dispositivos</h3>
        {responses.map(r => (
          <div key={r.jobId}>
            Job {r.jobId}: {r.status} - Device: {r.deviceId}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Troubleshooting

### Dispositivo não recebe jobs

1. Verifique se está conectado ao canal:
   ```typescript
   const status = realtimeService.getStatus();
   console.log('Conectado:', status.connected);
   ```

2. Verifique o console do navegador:
   ```
   [PrintBridge] Conectando ao canal realtime...
   [PrintBridge] Status do canal: SUBSCRIBED
   [PrintBridge] Dispositivo registrado: { ... }
   ```

3. Verifique permissões Supabase:
   - Certifique-se de que o usuário está autenticado
   - Verifique se o role é `print_bridge`

### Impressão falha

1. Verifique conexão da impressora:
   - Status deve mostrar "Conectada"
   - Device ID deve estar preenchido

2. Verifique logs:
   ```typescript
   const logs = PrintBridgeRealtime.getJobLogs();
   console.log(logs);
   ```

3. Teste impressão manual:
   - Use botão "Testar Impressão"
   - Confirme que impressora física está funcionando

### Reconexão constante

1. Verifique conectividade de rede
2. Verifique se Supabase está online
3. Aumente `maxReconnectAttempts` se necessário

## Próximos Passos

### Recursos Futuros

1. **Dashboard de Monitoramento**
   - Visualizar todos os dispositivos online
   - Estatísticas de impressão
   - Histórico de jobs por dispositivo

2. **Fila de Impressão**
   - Enfileirar múltiplos jobs
   - Priorização de trabalhos
   - Retry automático em caso de falha

3. **Notificações Push**
   - Alertar admin quando job é concluído
   - Notificar problemas de conexão
   - Status de dispositivos offline

4. **Agendamento**
   - Agendar impressões para horários específicos
   - Impressão em lote
   - Recorrência

## Referências

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Supabase Presence](https://supabase.com/docs/guides/realtime/presence)
- [ESC/POS Commands](./PRINTER_SETUP.md)
