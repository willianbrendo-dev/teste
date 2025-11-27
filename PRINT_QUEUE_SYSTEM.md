# Sistema de Fila de Impressão

## Visão Geral

O sistema de fila de impressão garante que nenhum job seja perdido, mesmo quando o Print Bridge está temporariamente offline ou ocupado processando outro job.

## Arquitetura

```
┌─────────────┐
│   Admin     │ Envia job de impressão
│   (Web)     │────────────────────┐
└─────────────┘                    │
                                   ▼
                          ┌────────────────────┐
                          │  Edge Function     │
                          │  send-print-job    │
                          └────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
         ┌──────────────────┐        ┌──────────────────┐
         │  Supabase        │        │  Broadcast       │
         │  print_jobs      │        │  (Realtime)      │
         │  (Fila/Queue)    │        └────────┬─────────┘
         └────────┬─────────┘                  │
                  │                            │
                  │                            │
                  └────────────┬───────────────┘
                               ▼
                    ┌──────────────────┐
                    │  Print Bridge    │
                    │  (Cliente)       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Impressora USB  │
                    └──────────────────┘
```

## Fluxo Dual: Broadcast + Queue

### 1. Envio Imediato (Broadcast)

Quando um job é criado:
1. Edge function verifica dispositivos online
2. Cria registro na tabela `print_jobs` com status `pending`
3. **Envia broadcast** via Realtime para o dispositivo
4. Se dispositivo está online e recebe o broadcast → impressão imediata

### 2. Processamento de Fila (Queue)

Se o broadcast falhar (dispositivo offline, busy, ou não recebeu):
1. Job fica com status `pending` no banco
2. Print Bridge verifica fila periodicamente
3. Usa RPC `get_next_pending_job` para buscar próximo job
4. Processa job da fila

## Momentos de Verificação da Fila

O Print Bridge verifica a fila em **4 momentos**:

### 1. **Ao Conectar**
```typescript
// Quando se conecta ao Realtime
console.log("[PrintBridge] ✅ Conectado - verificando fila...");
await this.processQueuedJobs();
```

### 2. **Periodicamente (a cada 10s)**
```typescript
// Timer automático enquanto conectado
setInterval(async () => {
  if (!this.isProcessing) {
    await this.processQueuedJobs();
  }
}, 10000);
```

### 3. **Após Completar Job**
```typescript
// Quando termina de processar fila de broadcast
this.isProcessing = false;
await this.processQueuedJobs();
```

### 4. **Via Heartbeat**
```typescript
// A cada 30s, mantém presença e verifica fila
await this.presenceChannel.track({...});
// Heartbeat mantém conexão ativa
```

## Função RPC: get_next_pending_job

```sql
CREATE FUNCTION get_next_pending_job(p_device_id text)
RETURNS TABLE(
  id uuid,
  job_id text,
  os_id uuid,
  escpos_data_base64 text,
  device_id text,
  attempts integer
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pj.id,
    pj.job_id,
    pj.os_id,
    pj.escpos_data_base64,
    pj.device_id,
    pj.attempts
  FROM print_jobs pj
  WHERE pj.device_id = p_device_id 
    AND pj.status = 'pending'
    AND pj.attempts < pj.max_attempts
  ORDER BY pj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Características importantes:**
- `FOR UPDATE SKIP LOCKED`: Previne que múltiplos devices peguem o mesmo job
- `ORDER BY created_at`: FIFO (First In, First Out)
- `attempts < max_attempts`: Só pega jobs que ainda podem tentar
- Retorna apenas 1 job por vez

## Estados de Job

| Status | Descrição | Próximo Estado |
|--------|-----------|----------------|
| `pending` | Job criado, aguardando processamento | `processing` |
| `processing` | Print Bridge está processando | `completed` ou `failed` |
| `completed` | Impressão bem-sucedida | - |
| `failed` | Falhou após todas tentativas | - |

## Retry Logic

Cada job tem:
- `max_attempts`: 3 (padrão)
- `attempts`: Contador de tentativas

Se falhar:
1. Incrementa `attempts`
2. Se `attempts < max_attempts` → volta para `pending`
3. Se `attempts >= max_attempts` → marca como `failed`

## Logs de Debug

### No Print Bridge (Console)

```
[PrintBridge] 🔍 Verificando fila de jobs pendentes...
[PrintBridge] Consultando fila para device: device_1764106148826_xxx
[PrintBridge] 📋 Job encontrado na fila: {
  jobId: 'aaaa09fd...',
  osId: '7ccbc30d...',
  attempt: 1
}
[PrintBridge] ===== INICIANDO PROCESSAMENTO DE JOB =====
[PrintBridge] ✅ Job aaaa09fd... concluído com sucesso via OTG Android
```

### No Edge Function

```
Online PRINT_BRIDGE devices: 1
Dispositivo selecionado: device_1764106148826_xxx
Print job created: aaaa09fd-5768-4793-9e59-2ec888ca3696
Broadcast result: ok
```

## Cenários de Uso

### Cenário 1: Print Bridge Online

1. Admin envia impressão
2. Edge function encontra device online
3. Cria job no banco (`pending`)
4. **Broadcast → Device recebe imediatamente**
5. Device processa e atualiza status para `completed`

**Resultado:** Impressão quase instantânea

### Cenário 2: Print Bridge Offline

1. Admin envia impressão
2. Edge function **NÃO** encontra device online
3. Retorna erro 503: "Nenhum dispositivo Print Bridge online"
4. Job **não é criado** no banco

**Resultado:** Erro imediato, job não entra na fila

### Cenário 3: Print Bridge Recém Conectado

1. Print Bridge conecta ao sistema
2. Executa `processQueuedJobs()` automaticamente
3. Busca todos jobs `pending` para este device
4. Processa fila FIFO

**Resultado:** Jobs antigos são impressos ao conectar

### Cenário 4: Print Bridge Busy

1. Admin envia impressão
2. Device está processando outro job
3. Edge function cria job com status `pending`
4. Broadcast enviado (mas device ignora por estar busy)
5. **Após 10s**, verificação periódica pega o job
6. Device processa da fila

**Resultado:** Job processado após conclusão do anterior

### Cenário 5: Falha de Rede no Broadcast

1. Admin envia impressão
2. Job criado no banco
3. Broadcast enviado mas não chega ao device (falha de rede)
4. **10s depois**, verificação periódica detecta job pendente
5. Device busca da fila e processa

**Resultado:** Job não é perdido, é processado pela fila

## Monitoramento

### Queries Úteis

**Ver jobs pendentes:**
```sql
SELECT job_id, device_id, attempts, created_at
FROM print_jobs
WHERE status = 'pending'
ORDER BY created_at;
```

**Ver jobs em processamento:**
```sql
SELECT job_id, device_id, processing_started_at
FROM print_jobs
WHERE status = 'processing';
```

**Ver taxa de sucesso:**
```sql
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM print_jobs
GROUP BY status;
```

**Ver jobs com múltiplas tentativas:**
```sql
SELECT job_id, device_id, attempts, status, error_message
FROM print_jobs
WHERE attempts > 1
ORDER BY created_at DESC;
```

## Troubleshooting

### Problema: Jobs ficam pendentes forever

**Causa:** Print Bridge não está verificando fila

**Solução:**
1. Verifique console do Print Bridge
2. Deve aparecer: "🔍 Verificação periódica da fila..."
3. Se não aparecer, recarregue página `/print-bridge`

### Problema: "Nenhum dispositivo Print Bridge online"

**Causa:** Print Bridge não está registrando presença

**Solução:**
1. Verifique se Print Bridge está conectado
2. Console deve mostrar: "✅ Presença registrada permanentemente"
3. Se não, veja `PRINT_BRIDGE_DEBUG.md`

### Problema: Job processa mas falha na impressão

**Causa:** Problema local com impressora

**Solução:**
1. Verifique conexão USB/Wi-Fi da impressora
2. Teste impressão local no Print Bridge
3. Veja logs detalhados no console

### Problema: Múltiplos devices pegando mesmo job

**Causa:** `FOR UPDATE SKIP LOCKED` não está funcionando

**Solução:**
- Isso não deve acontecer
- Se acontecer, é bug crítico no PostgreSQL
- Contate suporte

## Boas Práticas

1. **Mantenha Print Bridge sempre conectado**
   - Use dispositivo dedicado
   - Evite fechar aba

2. **Monitore fila regularmente**
   - Verifique jobs pendentes
   - Investigue falhas

3. **Configure alertas**
   - Jobs pendentes > 5 minutos
   - Taxa de falha > 5%

4. **Logs detalhados**
   - Sempre ative console no Print Bridge
   - Monitore edge function logs

5. **Multiple Devices**
   - Distribui carga
   - Redundância
   - Cada device tem sua própria fila

## Melhorias Futuras

- [ ] Dashboard de monitoramento de fila
- [ ] Priorização de jobs (urgentes primeiro)
- [ ] Load balancing entre múltiplos devices
- [ ] Notificações quando job fica pendente > X minutos
- [ ] Retry exponencial em vez de linear
- [ ] Dead letter queue para jobs que falharam demais
- [ ] Métricas: tempo médio na fila, throughput, etc.
