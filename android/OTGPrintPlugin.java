package app.lovable.mobile_order_pro;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;

@CapacitorPlugin(name = "OTGPrint")
public class OTGPrintPlugin extends Plugin {
    private static final String TAG = "OTGPrintPlugin";
    private static final String ACTION_USB_PERMISSION = "app.lovable.USB_PERMISSION";
    
    // Bematech MP-4200 TH VendorID
    private static final int BEMATECH_VENDOR_ID = 0x0DD4; // 3540 em decimal
    
    // Códigos de erro padronizados
    private static final String ERROR_USB_PERMISSION_DENIED = "UsbPermissionDenied";
    private static final String ERROR_DEVICE_NOT_FOUND = "DeviceNotFound";
    private static final String ERROR_INTERFACE_NOT_FOUND = "InterfaceNotFound";
    private static final String ERROR_ENDPOINT_NOT_FOUND = "EndpointBulkOutNotFound";
    private static final String ERROR_BULK_TRANSFER_FAILED = "bulkTransferFailed";
    private static final String ERROR_CONNECTION_CLOSED = "connectionClosed";
    private static final String ERROR_UNKNOWN = "unknownException";
    
    // Configurações de retry
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final int RETRY_DELAY_MS = 500;
    
    private UsbManager usbManager;
    private UsbDevice printerDevice;
    private UsbDeviceConnection connection;
    private UsbInterface usbInterface;
    private UsbEndpoint endpointOut;
    private boolean isConnected = false;

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            
            if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (device != null) {
                    JSObject ret = new JSObject();
                    ret.put("deviceId", device.getDeviceName());
                    ret.put("vendorId", device.getVendorId());
                    ret.put("productId", device.getProductId());
                    notifyListeners("usbDeviceAttached", ret);
                }
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (device != null && device.equals(printerDevice)) {
                    disconnect();
                    JSObject ret = new JSObject();
                    ret.put("deviceId", device.getDeviceName());
                    notifyListeners("usbDeviceDetached", ret);
                }
            } else if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null) {
                            connectToDevice(device);
                        }
                    } else {
                        Log.d(TAG, "Permission denied for device " + device);
                    }
                }
            }
        }
    };

    @Override
    public void load() {
        super.load();
        usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
        
        // Registrar receiver para eventos USB
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        filter.addAction(ACTION_USB_PERMISSION);
        getContext().registerReceiver(usbReceiver, filter);
        
        Log.d(TAG, "OTGPrintPlugin loaded");
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            getContext().unregisterReceiver(usbReceiver);
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering receiver", e);
        }
        disconnect();
    }

    @PluginMethod
    public void checkUsbHostSupport(PluginCall call) {
        boolean supported = getContext().getPackageManager()
            .hasSystemFeature("android.hardware.usb.host");
        
        JSObject ret = new JSObject();
        ret.put("supported", supported);
        call.resolve(ret);
        
        Log.d(TAG, "USB Host support: " + supported);
    }

    @PluginMethod
    public void connectToUsbPrinter(PluginCall call) {
        if (usbManager == null) {
            call.reject("USB Manager not available");
            return;
        }

        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        
        if (deviceList.isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "No USB devices found");
            call.resolve(ret);
            return;
        }

        // Procura por dispositivos de impressora
        // Prioridade 1: Bematech específico
        // Prioridade 2: Classe de impressora (classe 7)
        // Prioridade 3: Primeiro dispositivo disponível
        UsbDevice printerCandidate = null;
        
        for (UsbDevice device : deviceList.values()) {
            Log.d(TAG, "Found device: " + device.getDeviceName() + 
                  " VID:0x" + Integer.toHexString(device.getVendorId()) + 
                  " PID:0x" + Integer.toHexString(device.getProductId()) +
                  " Class:" + device.getDeviceClass());
            
            // Prioridade máxima: Bematech MP-4200 TH
            if (device.getVendorId() == BEMATECH_VENDOR_ID) {
                Log.d(TAG, "✓ Bematech device detected!");
                printerCandidate = device;
                break;
            }
            
            // Segunda prioridade: classe de impressora
            if (printerCandidate == null && 
                (device.getDeviceClass() == UsbConstants.USB_CLASS_PRINTER || 
                 device.getDeviceClass() == UsbConstants.USB_CLASS_PER_INTERFACE)) {
                printerCandidate = device;
            }
        }

        // Última opção: pega o primeiro dispositivo
        if (printerCandidate == null && !deviceList.isEmpty()) {
            printerCandidate = deviceList.values().iterator().next();
            Log.d(TAG, "No printer class found, using first available device");
        }

        if (printerCandidate == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "No USB devices found");
            ret.put("errorCode", ERROR_DEVICE_NOT_FOUND);
            call.resolve(ret);
            return;
        }

        printerDevice = printerCandidate;

        // Solicita permissão se necessário
        if (!usbManager.hasPermission(printerDevice)) {
            PendingIntent permissionIntent = PendingIntent.getBroadcast(
                getContext(), 
                0, 
                new Intent(ACTION_USB_PERMISSION), 
                PendingIntent.FLAG_IMMUTABLE
            );
            usbManager.requestPermission(printerDevice, permissionIntent);
            
            Log.d(TAG, "Requesting USB permission for device: " + printerDevice.getDeviceName());
            
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Permission requested - waiting for user approval");
            ret.put("errorCode", ERROR_USB_PERMISSION_DENIED);
            call.resolve(ret);
            return;
        }

        // Conecta ao dispositivo
        JSObject result = connectToDevice(printerDevice);
        call.resolve(result);
    }

    private JSObject connectToDevice(UsbDevice device) {
        JSObject ret = new JSObject();
        
        try {
            connection = usbManager.openDevice(device);
            if (connection == null) {
                Log.e(TAG, "Failed to open device connection");
                ret.put("success", false);
                ret.put("error", "Failed to open USB connection");
                ret.put("errorCode", ERROR_CONNECTION_CLOSED);
                return ret;
            }

            // Encontra interface e endpoint
            if (device.getInterfaceCount() == 0) {
                Log.e(TAG, "Device has no interfaces");
                connection.close();
                ret.put("success", false);
                ret.put("error", "No USB interfaces found");
                ret.put("errorCode", ERROR_INTERFACE_NOT_FOUND);
                return ret;
            }
            
            usbInterface = device.getInterface(0);
            
            if (!connection.claimInterface(usbInterface, true)) {
                Log.e(TAG, "Failed to claim interface");
                connection.close();
                ret.put("success", false);
                ret.put("error", "Failed to claim USB interface");
                ret.put("errorCode", ERROR_INTERFACE_NOT_FOUND);
                return ret;
            }

            // Procura endpoint BULK OUT
            endpointOut = null;
            for (int i = 0; i < usbInterface.getEndpointCount(); i++) {
                UsbEndpoint endpoint = usbInterface.getEndpoint(i);
                if (endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                    endpoint.getDirection() == UsbConstants.USB_DIR_OUT) {
                    endpointOut = endpoint;
                    Log.d(TAG, "Found BULK OUT endpoint: " + endpoint.getAddress());
                    break;
                }
            }

            if (endpointOut == null) {
                Log.e(TAG, "No BULK OUT endpoint found");
                connection.releaseInterface(usbInterface);
                connection.close();
                ret.put("success", false);
                ret.put("error", "No BULK OUT endpoint found");
                ret.put("errorCode", ERROR_ENDPOINT_NOT_FOUND);
                return ret;
            }

            isConnected = true;
            printerDevice = device;
            
            Log.d(TAG, "✓ Successfully connected to printer");
            
            ret.put("success", true);
            ret.put("deviceId", device.getDeviceName());
            ret.put("vendorId", device.getVendorId());
            ret.put("productId", device.getProductId());
            
            return ret;
            
        } catch (Exception e) {
            Log.e(TAG, "Error connecting to device", e);
            ret.put("success", false);
            ret.put("error", "Exception: " + e.getMessage());
            ret.put("errorCode", ERROR_UNKNOWN);
            return ret;
        }
    }

    @PluginMethod
    public void disconnectUsbPrinter(PluginCall call) {
        disconnect();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void disconnect() {
        if (connection != null) {
            if (usbInterface != null) {
                connection.releaseInterface(usbInterface);
            }
            connection.close();
            connection = null;
        }
        usbInterface = null;
        endpointOut = null;
        printerDevice = null;
        isConnected = false;
        Log.d(TAG, "Disconnected from printer");
    }

    @PluginMethod
    public void sendEscPosBuffer(PluginCall call) {
        if (!isConnected || connection == null || endpointOut == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Printer not connected");
            ret.put("errorCode", ERROR_CONNECTION_CLOSED);
            call.resolve(ret);
            return;
        }

        try {
            String dataStr = call.getString("data");
            if (dataStr == null) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "No data provided");
                ret.put("errorCode", ERROR_UNKNOWN);
                call.resolve(ret);
                return;
            }
            
            byte[] data;
            // Tenta decodificar como base64
            try {
                data = Base64.decode(dataStr, Base64.DEFAULT);
            } catch (Exception e) {
                // Se falhar, converte como UTF-8
                data = dataStr.getBytes("UTF-8");
            }

            // Tenta enviar com retry automático
            JSObject result = sendWithRetry(data, MAX_RETRY_ATTEMPTS);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error sending data", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Exception: " + e.getMessage());
            ret.put("errorCode", ERROR_UNKNOWN);
            call.resolve(ret);
        }
    }
    
    /**
     * Envia dados com retry automático
     */
    private JSObject sendWithRetry(byte[] data, int maxAttempts) {
        JSObject ret = new JSObject();
        int attempt = 0;
        
        while (attempt < maxAttempts) {
            attempt++;
            
            try {
                Log.d(TAG, "Send attempt " + attempt + "/" + maxAttempts + " (" + data.length + " bytes)");
                
                int bytesSent = connection.bulkTransfer(endpointOut, data, data.length, 5000);
                
                if (bytesSent >= 0) {
                    Log.d(TAG, "✓ Sent " + bytesSent + " bytes successfully");
                    ret.put("success", true);
                    ret.put("bytesSent", bytesSent);
                    ret.put("attempts", attempt);
                    return ret;
                }
                
                Log.e(TAG, "bulkTransfer failed with code: " + bytesSent);
                
                // Se não é a última tentativa, aguarda e tenta reconectar
                if (attempt < maxAttempts) {
                    Log.d(TAG, "Retrying after delay...");
                    Thread.sleep(RETRY_DELAY_MS * attempt);
                    
                    // Tenta reconectar
                    if (printerDevice != null) {
                        Log.d(TAG, "Attempting to reconnect...");
                        disconnectInternal();
                        Thread.sleep(RETRY_DELAY_MS);
                        JSObject reconnectResult = connectToDevice(printerDevice);
                        if (!reconnectResult.getBoolean("success", false)) {
                            Log.e(TAG, "Reconnection failed");
                        } else {
                            Log.d(TAG, "Reconnection successful");
                        }
                    }
                }
                
            } catch (InterruptedException e) {
                Log.e(TAG, "Sleep interrupted", e);
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                Log.e(TAG, "Error in attempt " + attempt, e);
            }
        }
        
        // Todas as tentativas falharam
        Log.e(TAG, "✗ All " + maxAttempts + " attempts failed");
        ret.put("success", false);
        ret.put("error", "Transfer failed after " + maxAttempts + " attempts");
        ret.put("errorCode", ERROR_BULK_TRANSFER_FAILED);
        ret.put("attempts", attempt);
        return ret;
    }
    
    /**
     * Desconexão interna (sem notificar listeners)
     */
    private void disconnectInternal() {
        if (connection != null) {
            try {
                if (usbInterface != null) {
                    connection.releaseInterface(usbInterface);
                }
                connection.close();
            } catch (Exception e) {
                Log.e(TAG, "Error during disconnect", e);
            }
            connection = null;
        }
        usbInterface = null;
        endpointOut = null;
        isConnected = false;
    }

    @PluginMethod
    public void getPrinterStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", isConnected);
        
        if (isConnected && printerDevice != null) {
            ret.put("deviceId", printerDevice.getDeviceName());
            ret.put("vendorId", printerDevice.getVendorId());
            ret.put("productId", printerDevice.getProductId());
        }
        
        call.resolve(ret);
    }
}
