# Configuração de Impressora Térmica Bematech MP-4200 TH

## Visão Geral

Este sistema implementa suporte completo para impressão em impressoras térmicas ESC/POS, especialmente otimizado para a **Bematech MP-4200 TH**.

## Recursos Implementados

### 1. Módulo ESC/POS (`src/lib/printer/escpos.ts`)
- Comandos ESC/POS completos para impressoras térmicas
- Formatação de texto (negrito, tamanho duplo)
- Alinhamento (esquerda, centro, direita)
- Quebra de linha e corte de papel
- Construção dinâmica de recibos

### 2. Conexão WebUSB (`src/lib/printer/webusb.ts`)
- Detecção e conexão com impressoras USB
- Gerenciamento de dispositivos pareados
- Envio direto de comandos via WebUSB
- Suporte a navegadores Chrome/Edge

### 3. Serviço de Impressão (`src/lib/printer/print-service.ts`)
- API unificada para todas as funções de impressão
- Armazenamento de configurações
- Funções específicas para:
  - Teste de impressão
  - Ordens de Serviço
  - Checklists
  - Recibos personalizados

### 4. Interface de Configuração (`/impressora`)
- Tela de configuração completa
- Detecção automática de impressoras USB
- Teste de impressão integrado
- Gerenciamento de configurações salvas

## Como Usar

### Passo 1: Configurar a Impressora

1. Acesse o menu **Impressora** no sistema
2. Conecte a impressora Bematech MP-4200 TH via USB
3. Clique em **"Conectar Impressora USB"**
4. Selecione a impressora na janela do navegador
5. Salve a configuração

### Passo 2: Testar a Conexão

- Clique no botão **"Teste de Impressão"**
- Verifique se o recibo de teste foi impresso corretamente

### Passo 3: Imprimir Documentos

#### Ordens de Serviço
```typescript
import { printService } from '@/lib/printer/print-service';

// Imprimir uma ordem de serviço
await printService.printServiceOrder(ordemServico);
```

#### Checklists
```typescript
import { printService } from '@/lib/printer/print-service';

// Imprimir um checklist
await printService.printChecklist(checklist);
```

#### Recibo Personalizado
```typescript
import { escposPrinter } from '@/lib/printer/escpos';
import { printService } from '@/lib/printer/print-service';

const lines = [
  { text: 'MINHA EMPRESA', align: 'center', bold: true, doubleSize: true },
  { text: '================================', align: 'center' },
  { text: 'Produto: Serviço XYZ', align: 'left' },
  { text: 'Valor: R$ 100,00', align: 'left', bold: true },
];

const data = escposPrinter.buildReceipt(lines);
await printService.sendToPrinter(data);
```

## Requisitos Técnicos

### Navegador
- **Recomendado**: Chrome, Edge ou outro navegador baseado em Chromium
- **Mínimo**: Versão com suporte a WebUSB API

### Impressora
- **Modelo**: Bematech MP-4200 TH (ou compatível ESC/POS)
- **Conexão**: USB (Serial e Rede planejados para versões futuras)
- **Driver**: Não é necessário driver específico (comunicação direta via ESC/POS)

## Comandos ESC/POS Utilizados

| Comando | Código | Função |
|---------|--------|--------|
| ESC @ | `0x1B 0x40` | Inicializar impressora |
| ESC a n | `0x1B 0x61 n` | Alinhamento (0=esq, 1=centro, 2=dir) |
| ESC E n | `0x1B 0x45 n` | Negrito (0=off, 1=on) |
| GS ! n | `0x1D 0x21 n` | Tamanho do texto |
| LF | `0x0A` | Quebra de linha |
| GS V 0 | `0x1D 0x56 0x00` | Corte total do papel |
| GS V 1 | `0x1D 0x56 0x01` | Corte parcial do papel |

## Solução de Problemas

### Impressora não detectada
1. Verifique se o cabo USB está conectado
2. Confirme que está usando Chrome ou Edge
3. Tente desconectar e reconectar a impressora
4. Recarregue a página

### Erro ao imprimir
1. Verifique se a impressora está ligada
2. Confirme que há papel na impressora
3. Reconecte a impressora nas configurações
4. Teste a impressão novamente

### WebUSB não suportado
- Use um navegador baseado em Chrome
- Atualize seu navegador para a versão mais recente
- Verifique se WebUSB não está bloqueado nas configurações

## Segurança

- A conexão WebUSB requer permissão explícita do usuário
- As configurações são salvas localmente no navegador
- Nenhum dado é enviado para servidores externos
- A comunicação é direta entre navegador e impressora

## Desenvolvimento Futuro

- [ ] Suporte a impressoras de rede (Ethernet/Wi-Fi)
- [ ] Suporte a porta Serial
- [ ] Impressão de códigos de barras
- [ ] Impressão de QR codes
- [ ] Templates personalizáveis
- [ ] Preview de impressão

## Suporte

Para mais informações sobre comandos ESC/POS, consulte:
- Manual da Bematech MP-4200 TH
- Documentação ESC/POS padrão
- WebUSB API: https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API
