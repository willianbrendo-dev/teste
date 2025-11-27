# Debug: Print Bridge - Dispositivo Offline

## Problema Identificado

O edge function `send-print-job` retorna erro 503:
```
"Nenhum dispositivo Print Bridge online no momento"
```

### Causa Raiz

O edge function não estava conseguindo detectar os dispositivos Print Bridge conectados devido a:

1. **Race Condition**: O canal de presença não estava totalmente sincronizado antes da leitura
2. **Logs Insuficientes**: Faltavam logs detalhados para debug
3. **Timeout Curto**: Não havia tempo suficiente para o `presenceState()` popular

## Correções Implementadas

### 1. Melhor Sincronização no Edge Function

```typescript
// Aguarda sync completo com timeout
await new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Timeout ao conectar ao canal de presença'));
  }, 5000);

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      console.log('Presença sincronizada');
      clearTimeout(timeout);
      resolve();
    })
    .subscribe();
});

// Aguarda mais 500ms para garantir que presenceState está populado
await new Promise(resolve => setTimeout(resolve, 500));
```

### 2. Logs Detalhados no Edge Function

Agora loga:
- Estado completo de presença
- Cada dispositivo verificado
- Role e status de cada device
- IDs dos dispositivos encontrados

### 3. Logs Melhorados no Print Bridge Client

```typescript
const trackResult = await this.presenceChannel?.track({
  role: "print_bridge",
  deviceId: this.deviceId,
  timestamp: Date.now(),
  online: true,
  version: "2.0"
});

console.log("[PrintBridge] Track result:", trackResult);
console.log("[PrintBridge] Device ID registrado:", this.deviceId);

// Verifica presença após registro
setTimeout(() => {
  const state = this.presenceChannel?.presenceState();
  console.log("[PrintBridge] Estado de presença após registro:", state);
}, 1000);
```

## Como Verificar se Está Funcionando

### 1. Abra a página Print Bridge

Acesse `/print-bridge` e conecte o dispositivo

### 2. Verifique os Logs do Console

Você deve ver:
```
[PrintBridge] ✅ Presença registrada permanentemente
[PrintBridge] Track result: ok
[PrintBridge] Device ID registrado: device_1764106148826_xxx
[PrintBridge] Estado de presença após registro: {...}
[PrintBridge] ✅ Conectado permanentemente - Pronto para jobs!
```

### 3. Tente Enviar uma Impressão

Nos logs da edge function você deve ver:
```
Criando canal de presença...
Status do canal de presença: SUBSCRIBED
Presença sincronizada
Estado de presença completo: {
  "device_1764106148826_xxx": [{
    "role": "print_bridge",
    "deviceId": "device_1764106148826_xxx",
    "online": true,
    "timestamp": 1764106149000
  }]
}
Dispositivos Print Bridge online: 1
IDs dos dispositivos: ["device_1764106148826_xxx"]
Dispositivo selecionado: device_1764106148826_xxx
```

### 4. Se Ainda Assim Não Funcionar

**Causas possíveis:**

1. **Print Bridge desconectou**
   - Verifique se a aba `/print-bridge` está aberta
   - PWA pode desconectar quando minimizado
   
2. **Problema de rede**
   - Verifique conexão internet
   - Firewall pode estar bloqueando WebSockets
   
3. **Sessão expirou**
   - Faça logout e login novamente
   - Verifique se tem role `print_bridge`

4. **Múltiplos dispositivos**
   - Feche outras abas com `/print-bridge` aberto
   - Limpe localStorage se necessário

## Testando Passo-a-Passo

### Teste 1: Verificar Presença Manual

Abra console no `/print-bridge`:

```javascript
// Verifica se presenceChannel existe
console.log(realtimeServiceRef.current?.presenceChannel)

// Verifica estado de presença
const state = realtimeServiceRef.current?.presenceChannel?.presenceState()
console.log('Estado:', state)
```

### Teste 2: Forçar Re-track

```javascript
await realtimeServiceRef.current?.presenceChannel?.track({
  role: "print_bridge",
  deviceId: localStorage.getItem('print_bridge_device_id'),
  timestamp: Date.now(),
  online: true,
  version: "2.0"
})
```

### Teste 3: Verificar Heartbeat

```javascript
// O heartbeat deve rodar a cada 30 segundos
// Verifique nos logs do console:
[PrintBridge] Heartbeat enviado
```

## Monitoramento em Produção

### Logs para Observar

**No Cliente (Print Bridge):**
- ✅ Presença registrada
- ✅ Conectado permanentemente
- ⏰ Heartbeat enviado (a cada 30s)
- 📥 Job recebido
- ✅ Job concluído

**No Edge Function:**
- Presença sincronizada
- Dispositivos Print Bridge online: X
- Job enviado via broadcast
- Broadcast result: ok

### Métricas

- **Uptime**: Print Bridge deve ficar online continuamente
- **Latência**: Jobs devem ser recebidos em < 2 segundos
- **Taxa de Sucesso**: > 95% dos jobs devem completar com sucesso

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Dispositivo offline | Recarregue página `/print-bridge` |
| Jobs não recebidos | Verifique logs do broadcast no edge function |
| Impressora não imprime | Verifique conexão USB/Wi-Fi local |
| Sessão expira | Aumente intervalo de refresh para 5 min |
| Múltiplos jobs duplicados | Previna duplo clique no botão |

## Configuração Recomendada

Para produção, recomendamos:

1. **APK Nativo** em vez de PWA (melhor confiabilidade)
2. **Impressora Wi-Fi** como backup para USB
3. **Monitor dedicado** exibindo página Print Bridge 24/7
4. **Alertas** quando dispositivo ficar offline > 5 minutos

## Próximos Passos

- [ ] Testar com múltiplos dispositivos Print Bridge
- [ ] Implementar load balancing entre dispositivos
- [ ] Adicionar dashboard de monitoramento
- [ ] Configurar alertas automáticos
- [ ] Build APK para produção
