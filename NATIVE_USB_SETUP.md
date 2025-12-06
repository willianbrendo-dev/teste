# Configuração USB OTG Nativo para Android

## Visão Geral

Este documento descreve a implementação de impressão térmica via USB OTG nativo no Android usando Capacitor.

## Arquitetura

### Camadas

1. **Plugin Nativo (Java)** - `android/OTGPrintPlugin.java`
   - Comunicação direta com hardware USB
   - Gerenciamento de permissões
   - Envio de comandos ESC/POS via `bulkTransfer`

2. **Interface TypeScript** - `src/lib/printer/otg-printer.ts`
   - Bridge entre JavaScript e código nativo
   - Definição de tipos e contratos

3. **Serviço de Impressão** - `src/lib/printer/print-service-native.ts`
   - API de alto nível para impressão
   - Formatação de documentos
   - Conversão ESC/POS

4. **UI** - `src/pages/PrintBridge.tsx`
   - Interface do usuário
   - Detecção automática de plataforma
   - Logs e status

## Arquivos Criados/Modificados

### Novos Arquivos

- `capacitor.config.ts` - Configuração do Capacitor
- `src/lib/printer/otg-printer.ts` - Interface do plugin
- `src/lib/printer/otg-printer-web.ts` - Fallback WebUSB
- `src/lib/printer/print-service-native.ts` - Serviço nativo
- `android/OTGPrintPlugin.java` - Plugin Java
- `android/AndroidManifest.xml` - Configuração de permissões
- `android/res/xml/usb_device_filter.xml` - Filtros de dispositivos

### Arquivos Modificados

- `src/pages/PrintBridge.tsx` - Detecção de plataforma e UI adaptativa

## Instruções de Instalação

### 1. Instalar Dependências

As dependências do Capacitor já foram instaladas:
- `@capacitor/core`
- `@capacitor/cli`
- `@capacitor/android`

### 2. Inicializar o Capacitor

```bash
npx cap init
```

O Capacitor já está configurado com:
- App ID: `app.lovable.8bcdfb9f8e544647b419e88a58d14c63`
- App Name: `mobile-order-pro`

### 3. Exportar para GitHub

1. Use o botão "Export to GitHub" na interface do Lovable
2. Clone o repositório localmente:

```bash
git clone <seu-repositorio>
cd mobile-order-pro
```

### 4. Instalar Dependências Node

```bash
npm install
```

### 5. Adicionar Plataforma Android

```bash
npx cap add android
```

### 6. Copiar Arquivos Nativos

Copie os arquivos criados para o projeto Android:

```bash
# Copiar o plugin Java
cp android/OTGPrintPlugin.java android/app/src/main/java/app/lovable/mobile_order_pro/

# Copiar configurações XML
cp android/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
mkdir -p android/app/src/main/res/xml
cp android/res/xml/usb_device_filter.xml android/app/src/main/res/xml/
```

### 7. Registrar o Plugin

Edite `android/app/src/main/java/app/lovable/mobile_order_pro/MainActivity.java`:

```java
package app.lovable.mobile_order_pro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Registrar plugin customizado
    registerPlugin(OTGPrintPlugin.class);
  }
}
```

### 8. Build e Sync

```bash
npm run build
npx cap sync android
```

### 9. Abrir no Android Studio

```bash
npx cap open android
```

### 10. Executar no Dispositivo

No Android Studio:
1. Conecte um dispositivo Android com USB OTG
2. Clique em "Run" (Shift + F10)
3. Aguarde o build e instalação

## Como Usar

### No Dispositivo Android

1. Abra o app
2. Faça login com um usuário role `print_bridge`
3. Conecte uma impressora térmica via cabo OTG
4. O sistema detectará automaticamente o modo nativo
5. Clique em "Conectar Impressora via OTG"
6. Conceda a permissão USB quando solicitado
7. Teste a impressão

### Status da Impressora

A interface mostra:
- **Modo**: OTG Nativo ou WebUSB
- **USB Host**: Suportado/Não suportado
- **Status**: Conectada/Desconectada/Permissão necessária
- **Device ID**: Identificação do dispositivo USB
- **Vendor/Product ID**: IDs do fabricante e produto

### Logs de Jobs

Todos os jobs de impressão são registrados com:
- Timestamp
- Status (sucesso/erro)
- Descrição
- Conteúdo resumido

## API do Plugin

### `checkUsbHostSupport()`
Verifica se o dispositivo suporta USB Host.

```typescript
const { supported } = await OTGPrint.checkUsbHostSupport();
```

### `connectToUsbPrinter()`
Solicita permissão e conecta à impressora.

```typescript
const result = await OTGPrint.connectToUsbPrinter();
if (result.success) {
  console.log('Conectado:', result.deviceId);
}
```

### `disconnectUsbPrinter()`
Desconecta da impressora.

```typescript
await OTGPrint.disconnectUsbPrinter();
```

### `sendEscPosBuffer(data)`
Envia comandos ESC/POS para impressora.

```typescript
const data = escposPrinter.buildReceipt([...]);
const base64 = btoa(String.fromCharCode(...data));
await OTGPrint.sendEscPosBuffer({ data: base64 });
```

### `getPrinterStatus()`
Obtém status atual da impressora.

```typescript
const status = await OTGPrint.getPrinterStatus();
console.log('Conectada:', status.connected);
```

### Event Listeners

```typescript
// Dispositivo conectado
OTGPrint.addListener('usbDeviceAttached', (info) => {
  console.log('USB conectado:', info);
});

// Dispositivo desconectado
OTGPrint.addListener('usbDeviceDetached', (info) => {
  console.log('USB desconectado:', info);
});
```

## Impressoras Suportadas

O filtro USB aceita as seguintes impressoras:

- **Classe USB 7** (Impressoras)
- **Bematech** (VID: 1155)
- **Epson** (VID: 1208)
- **Star Micronics** (VID: 1305)
- **Genéricas** (VID: 1659, 1046)

Para adicionar outras, edite `android/res/xml/usb_device_filter.xml`.

## Comandos ESC/POS

O sistema usa os mesmos comandos ESC/POS do módulo web:
- Inicialização: `ESC @`
- Alinhamento: `ESC a n`
- Negrito: `ESC E n`
- Tamanho duplo: `GS ! n`
- Corte: `GS V 0`
- Códigos de barras: `GS k`
- QR Codes: `GS ( k`

Veja `src/lib/printer/escpos.ts` para detalhes.

## Troubleshooting

### Impressora não é detectada

1. Verifique se o cabo OTG está funcionando
2. Teste com outro app USB (USB Device Info)
3. Verifique permissões no AndroidManifest.xml
4. Adicione o Vendor ID no usb_device_filter.xml

### Permissão negada

- O sistema solicitará permissão automaticamente
- Se negar, precisará reconectar o cabo
- Permissões são salvas por dispositivo

### Erro ao enviar dados

1. Verifique conexão física
2. Confirme que a impressora está ligada
3. Verifique logs no Logcat do Android Studio
4. Teste com comandos ESC/POS mais simples

### App não roda no dispositivo

1. Ative "Depuração USB" no Android
2. Aceite permissões de desenvolvedor
3. Use cabo USB bom (não apenas carregador)

## Desenvolvimento

### Logs Nativos

Para ver logs do plugin:

```bash
adb logcat | grep OTGPrintPlugin
```

### Debug no Android Studio

1. Abra o projeto: `npx cap open android`
2. Coloque breakpoints em `OTGPrintPlugin.java`
3. Execute em modo Debug
4. Interaja com o app

### Hot Reload

Com o server configurado no `capacitor.config.ts`, o app carrega do Lovable:
```typescript
server: {
  url: 'https://8bcdfb9f-8e54-4647-b419-e88a58d14c63.lovableproject.com',
  cleartext: true
}
```

Para desenvolvimento local, altere para:
```typescript
server: {
  url: 'http://192.168.1.XXX:5173',
  cleartext: true
}
```

## Próximos Passos

1. ✅ Configurar Capacitor
2. ✅ Criar plugin nativo USB OTG
3. ✅ Implementar serviço de impressão
4. ✅ Integrar com UI existente
5. ⏳ Testar em dispositivos reais
6. ⏳ Adicionar suporte a mais impressoras
7. ⏳ Implementar fila de impressão remota
8. ⏳ Sincronização em tempo real via Supabase

## Referências

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android USB Host](https://developer.android.com/guide/topics/connectivity/usb/host)
- [ESC/POS Commands](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
