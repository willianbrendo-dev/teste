# Integração SDK Elgin - Instruções Avançadas

## ⚠️ Importante
Esta integração requer configuração manual via Android Studio após exportar o projeto.

## Pré-requisitos
- Android Studio instalado
- Projeto exportado via Git
- SDK Elgin (`InterfaceAutomacao-v2.0.0.12.aar`) já copiado para `android/app/libs/`

## Passo 1: Adicionar Plataforma Android

```bash
npx cap add android
npx cap sync
```

## Passo 2: Configurar Gradle

Abra `android/app/build.gradle` e adicione:

```gradle
android {
    // ... configurações existentes
    
    repositories {
        flatDir {
            dirs 'libs'
        }
    }
}

dependencies {
    // ... dependências existentes
    
    // SDK Elgin
    implementation files('libs/InterfaceAutomacao-v2.0.0.12.aar')
}
```

## Passo 3: Atualizar OTGPrintPlugin.java

Substitua o plugin atual por esta versão que usa o SDK Elgin:

```java
package app.lovable.mobile_order_pro;

import android.content.Context;
import android.util.Log;

import com.elgin.e1.Impressora.Termica;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OTGPrint")
public class OTGPrintPlugin extends Plugin {
    private static final String TAG = "OTGPrintElgin";
    private Termica impressora;
    private boolean isConnected = false;
    private String deviceId = "";

    @Override
    public void load() {
        super.load();
        impressora = new Termica(getContext());
        Log.d(TAG, "Plugin Elgin carregado");
    }

    @PluginMethod
    public void checkUsbHostSupport(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void connectToUsbPrinter(PluginCall call) {
        try {
            Log.d(TAG, "Conectando à impressora Elgin via USB...");
            
            // Abre conexão USB (modelo M8 = USB OTG)
            int result = impressora.AbreConexaoImpressora(6, "M8", "", 0);
            
            JSObject ret = new JSObject();
            
            if (result == 0) {
                isConnected = true;
                deviceId = "Elgin-M8-USB";
                
                ret.put("success", true);
                ret.put("deviceId", deviceId);
                ret.put("vendorId", 0x0DD4); // Bematech/Elgin
                ret.put("productId", 0x0000);
                
                Log.d(TAG, "✅ Conectado com sucesso via SDK Elgin");
            } else {
                ret.put("success", false);
                ret.put("error", "Falha ao conectar: código " + result);
                ret.put("errorCode", "ElginConnectionFailed");
                
                Log.e(TAG, "❌ Falha na conexão: " + result);
            }
            
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Exceção ao conectar", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            ret.put("errorCode", "Exception");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void disconnectUsbPrinter(PluginCall call) {
        try {
            int result = impressora.FechaConexaoImpressora();
            isConnected = false;
            deviceId = "";
            
            JSObject ret = new JSObject();
            ret.put("success", result == 0);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao desconectar", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void sendEscPosBuffer(PluginCall call) {
        if (!isConnected) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Impressora não conectada");
            ret.put("errorCode", "NotConnected");
            call.resolve(ret);
            return;
        }

        try {
            String dataStr = call.getString("data");
            if (dataStr == null) {
                throw new Exception("Dados não fornecidos");
            }

            // Envia dados brutos via SDK Elgin
            int result = impressora.ImprimeXMLSAT(dataStr, 0, 0);
            
            JSObject ret = new JSObject();
            
            if (result == 0) {
                ret.put("success", true);
                ret.put("bytesSent", dataStr.length());
                Log.d(TAG, "✅ Impressão enviada com sucesso");
            } else {
                ret.put("success", false);
                ret.put("error", "Falha ao imprimir: código " + result);
                ret.put("errorCode", "ElginPrintFailed");
                Log.e(TAG, "❌ Falha na impressão: " + result);
            }
            
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Exceção ao enviar dados", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            ret.put("errorCode", "Exception");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getPrinterStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", isConnected);
        ret.put("deviceId", deviceId);
        ret.put("vendorId", 0x0DD4);
        ret.put("productId", 0x0000);
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        if (isConnected) {
            impressora.FechaConexaoImpressora();
        }
        super.handleOnDestroy();
    }
}
```

## Passo 4: Testar

```bash
npx cap sync
npx cap run android
```

## Vantagens do SDK Elgin

✅ **Gerenciamento de conexão robusto** - Mantém conexão persistente  
✅ **Reconexão automática** - Recupera de erros automaticamente  
✅ **Comandos otimizados** - Específicos para Elgin/Bematech  
✅ **Melhor performance** - Menor latência de impressão  
✅ **Suporte oficial** - Documentação e suporte do fabricante  

## Observações

- O SDK Elgin usa métodos nativos específicos da biblioteca
- Funciona apenas com impressoras Elgin/Bematech compatíveis
- Requer Android 5.0+ com suporte USB Host/OTG
- Não funciona em navegadores (apenas APK nativo)

## Suporte

Para dúvidas sobre o SDK, consulte a documentação oficial da Elgin:
https://elgindevelopercommunity.github.io/
