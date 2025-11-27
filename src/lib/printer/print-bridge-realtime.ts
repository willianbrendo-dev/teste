import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { nativePrintService } from "./print-service-native";
import { bematechUserClient } from "./bematech-user-client";
import { printService } from "./print-service";
import { webusbPrinter } from "./webusb";
import { NetworkPrinter } from "./network-printer";

export interface PrintJob {
  jobId: string;
  action: "print";
  escposDataBase64: string;
  documentType?: "service_order" | "checklist" | "receipt" | "custom";
  metadata?: {
    ordemId?: string;
    checklistId?: string;
    description?: string;
  };
}

export interface PrintJobResponse {
  jobId: string;
  status: "OK" | "ERROR";
  timestamp: number;
  deviceId: string;
  error?: string;
}

export interface DeviceRegistration {
  role: "PRINT_BRIDGE";
  action: "online" | "offline";
  deviceId: string;
  timestamp: number;
  deviceInfo?: string;
}

export class PrintBridgeRealtime {
  private channel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private deviceId: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 2000;
  private isNativeMode: boolean = false;
  private onJobReceived?: (job: PrintJob) => void;
  private onStatusChange?: (status: "connected" | "disconnected" | "reconnecting") => void;
  private onJobStatusChange?: (jobId: string, status: "processing" | "completed" | "failed", error?: string) => void;
  private isProcessing: boolean = false;
  private jobQueue: PrintJob[] = [];
  private printMethod: "usb" | "wifi" | "bematech" = "usb";
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private keepAlive: boolean = true;
  private queueCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    deviceId: string,
    isNativeMode: boolean = false,
    callbacks?: {
      onJobReceived?: (job: PrintJob) => void;
      onStatusChange?: (status: "connected" | "disconnected" | "reconnecting") => void;
      onJobStatusChange?: (jobId: string, status: "processing" | "completed" | "failed", error?: string) => void;
    }
  ) {
    this.deviceId = deviceId;
    this.isNativeMode = isNativeMode;
    this.onJobReceived = callbacks?.onJobReceived;
    this.onStatusChange = callbacks?.onStatusChange;
    this.onJobStatusChange = callbacks?.onJobStatusChange;
  }

  setPrintMethod(method: "usb" | "wifi" | "bematech"): void {
    this.printMethod = method;
    console.log(`[PrintBridge] Método de impressão alterado para: ${method}`);
  }

  /**
   * Conecta ao canal Realtime e registra o dispositivo
   */
  async connect(): Promise<boolean> {
    try {
      console.log("[PrintBridge] 🔌 Conectando permanentemente ao canal realtime...");
      
      this.keepAlive = true;
      
      // Limpa tentativas anteriores
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Desconecta canais antigos se existirem
      if (this.presenceChannel) {
        await supabase.removeChannel(this.presenceChannel);
      }
      if (this.channel) {
        await supabase.removeChannel(this.channel);
      }
      
      // Cria canal de presença com configurações otimizadas
      this.presenceChannel = supabase.channel("print_bridge_presence", {
        config: {
          presence: { key: this.deviceId },
          broadcast: { self: true },
        },
      });

      // Registra presença
      this.presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = this.presenceChannel?.presenceState();
          console.log("[PrintBridge] Presence sync:", Object.keys(state || {}).length, "devices");
        })
        .on("presence", { event: "join" }, ({ key }) => {
          console.log("[PrintBridge] Device joined:", key);
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          console.log("[PrintBridge] Device left:", key);
        });

      await this.presenceChannel.subscribe(async (status) => {
        console.log("[PrintBridge] Status do canal de presença:", status);
        
        if (status === "SUBSCRIBED") {
          // Registra presença com role
          const trackResult = await this.presenceChannel?.track({
            role: "print_bridge",
            deviceId: this.deviceId,
            timestamp: Date.now(),
            online: true,
            version: "2.0"
          });
          
          console.log("[PrintBridge] ✅ Presença registrada permanentemente");
          console.log("[PrintBridge] Track result:", trackResult);
          console.log("[PrintBridge] Device ID registrado:", this.deviceId);
          
          localStorage.setItem("print_bridge_last_online", new Date().toISOString());
          
          // Verifica presença após registro
          setTimeout(() => {
            const state = this.presenceChannel?.presenceState();
            console.log("[PrintBridge] Estado de presença após registro:", state);
          }, 1000);
          
          // Inicia heartbeat para manter presença ativa
          this.startHeartbeat();
          
          // Inicia verificação de fila
          this.startQueueCheck();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("[PrintBridge] ⚠️ Erro no canal de presença:", status);
          // Só reconecta se keepAlive estiver ativo
          if (this.keepAlive) {
            await this.handleReconnect();
          }
        }
      });

      // Canal para receber jobs com configurações otimizadas
      this.channel = supabase.channel("print_bridge_jobs", {
        config: {
          broadcast: { ack: true, self: false },
        },
      });

      // Escuta comandos de impressão
      this.channel.on(
        "broadcast",
        { event: "print_job" },
        async (payload) => {
          // --- CÓDIGO DE DEBUG RADICAL ---
          console.log("🚨 [DEBUG] OPA! Chegou algo no Broadcast!");
          
          const rawJob = payload.payload || payload;
          
          // Debug: Mostra no console QUAIS propriedades chegaram
          console.log("🚨 [DEBUG] Propriedades recebidas:", Object.keys(rawJob));

          // Tenta pegar o Base64 de qualquer jeito
          const escposData = rawJob.escposDataBase64 || rawJob.escpos_data_base64 || rawJob.escposBase64;
          
          // Tenta pegar os IDs de qualquer jeito
          const targetJobId = rawJob.jobId || rawJob.job_id || rawJob.id;
          const targetOsId = rawJob.osId || rawJob.os_id;

          if (!escposData) {
            console.error("❌ [ERRO] O envelope chegou vazio (sem Base64)!");
            // Vamos tentar mostrar um alerta na tela do celular pra você saber que falhou aqui
            alert("ERRO: Recebi o pedido, mas veio sem dados de impressão!");
            return;
          }

          console.log("✅ [DEBUG] Dados encontrados! Tamanho:", escposData.length);
          console.log("🚀 [DEBUG] Ignorando verificação de Device ID e forçando impressão...");

          // CHAMADA DIRETA SEM VERIFICAÇÃO DE ID
          await this.handlePrintJob({
              jobId: targetJobId,
              action: "print",
              escposDataBase64: escposData,
              documentType: rawJob.documentType || "service_order",
              metadata: rawJob.metadata || { ordemId: targetOsId }
          });
        }
      );

      // Subscribe ao canal de jobs
      await this.channel.subscribe(async (status) => {
        console.log("[PrintBridge] Status do canal de jobs:", status);
        
        if (status === "SUBSCRIBED") {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.onStatusChange?.("connected");
          
          console.log("[PrintBridge] ✅ Conectado permanentemente - Pronto para jobs!");
          
          // Processa fila existente imediatamente após conectar
          console.log("[PrintBridge] 🔍 Verificando fila de jobs pendentes...");
          await this.processQueuedJobs();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.isConnected = false;
          this.onStatusChange?.("disconnected");
          // Só reconecta se keepAlive estiver ativo
          if (this.keepAlive) {
            await this.handleReconnect();
          }
        }
      });

      return true;
    } catch (error) {
      console.error("[PrintBridge] Erro ao conectar:", error);
      this.isConnected = false;
      this.onStatusChange?.("disconnected");
      await this.handleReconnect();
      return false;
    }
  }
  
  /**
   * Inicia heartbeat para manter conexão ativa
   */
  private startHeartbeat(): void {
    // Limpa heartbeat anterior
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Envia heartbeat a cada 30 segundos
    this.heartbeatInterval = setInterval(async () => {
      if (this.presenceChannel && this.isConnected) {
        try {
          await this.presenceChannel.track({
            role: "print_bridge",
            deviceId: this.deviceId,
            timestamp: Date.now(),
            online: true,
            version: "2.0"
          });
          console.log("[PrintBridge] Heartbeat enviado");
        } catch (error) {
          console.error("[PrintBridge] Erro no heartbeat:", error);
        }
      }
    }, 30000);
  }
  
  /**
   * Para o heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Inicia verificação periódica da fila
   */
  private startQueueCheck(): void {
    // Limpa verificação anterior
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
    }
    
    // Verifica fila a cada 10 segundos
    this.queueCheckInterval = setInterval(async () => {
      if (this.isConnected && !this.isProcessing) {
        console.log("[PrintBridge] 🔍 Verificação periódica da fila...");
        await this.processQueuedJobs();
      }
    }, 10000);
  }
  
  /**
   * Para verificação da fila
   */
  private stopQueueCheck(): void {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
      this.queueCheckInterval = null;
    }
  }
  
  /**
   * Processa jobs pendentes na fila do banco de dados
   */
  private async processQueuedJobs(): Promise<void> {
    if (this.isProcessing) {
      console.log("[PrintBridge] Já está processando, ignorando verificação de fila");
      return;
    }

    try {
      console.log("[PrintBridge] Consultando fila para device:", this.deviceId);
      
      // Busca próximo job pendente para este dispositivo
      const { data, error } = await supabase.rpc("get_next_pending_job", {
        p_device_id: this.deviceId
      });

      if (error) {
        console.error("[PrintBridge] Erro ao buscar job da fila:", error);
        return;
      }

      if (!data || data.length === 0) {
        console.log("[PrintBridge] ✓ Nenhum job pendente na fila");
        return;
      }

      // A função RPC retorna array, pega o primeiro
      const jobs = Array.isArray(data) ? data : [data];
      if (jobs.length === 0) {
        console.log("[PrintBridge] ✓ Nenhum job pendente na fila");
        return;
      }

      const job = jobs[0];
      console.log("[PrintBridge] 📋 Job encontrado na fila:", {
        jobId: job.job_id.slice(0, 8) + "...",
        osId: job.os_id,
        attempt: job.attempts + 1
      });

      // Processa o job
      await this.handlePrintJob({
        jobId: job.job_id,
        action: "print",
        escposDataBase64: job.escpos_data_base64,
        documentType: "service_order",
        metadata: {
          ordemId: job.os_id
        }
      });

    } catch (error) {
      console.error("[PrintBridge] Erro ao processar fila:", error);
    }
  }

  /**
   * Desconecta do canal e marca dispositivo como offline
   */
  async disconnect(): Promise<void> {
    console.log("[PrintBridge] 🔌 Desconectando (logout manual)...");
    
    // Desativa keep-alive para não reconectar
    this.keepAlive = false;
    
    // Para heartbeat e queue check
    this.stopHeartbeat();
    this.stopQueueCheck();
    
    // Limpa timeouts de reconexão
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Remove canais
    if (this.presenceChannel) {
      await supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    
    this.isConnected = false;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.onStatusChange?.("disconnected");
    
    console.log("[PrintBridge] ✅ Desconectado");
  }

  /**
   * Adiciona job à fila e processa
   */
  private async handlePrintJob(job: PrintJob): Promise<void> {
    console.log("[PrintBridge] Job recebido:", job.jobId);
    
    // Notifica callback se existir
    this.onJobReceived?.(job);

    // Adiciona à fila
    this.jobQueue.push(job);
    
    // Se não está processando, inicia processamento
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Processa fila de jobs sequencialmente
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift()!;
      await this.processJob(job);
    }

    this.isProcessing = false;
    
    // Após processar fila de broadcast, verifica se há jobs pendentes no banco
    console.log("[PrintBridge] 🔍 Fila de broadcast vazia, verificando banco...");
    await this.processQueuedJobs();
  }

  /**
   * Processa um único job com retry automático
   */
  private async processJob(job: PrintJob): Promise<void> {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: string | undefined;

    // Atualiza status para processing
    await this.updateJobStatus(job.jobId, "processing");
    this.onJobStatusChange?.(job.jobId, "processing");

    console.log(`[PrintBridge] ===== INICIANDO PROCESSAMENTO DE JOB =====`);
    console.log(`[PrintBridge] Job ID: ${job.jobId}`);
    console.log(`[PrintBridge] Tipo: ${job.documentType || 'custom'}`);
    console.log(`[PrintBridge] Modo: ${this.isNativeMode ? 'OTG Android' : 'WebUSB/Wi-Fi'}`);

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`[PrintBridge] Tentativa ${attempt}/${maxAttempts} para job ${job.jobId}`);

      try {
        // Decodifica base64 para Uint8Array
        const binaryString = atob(job.escposDataBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log(`[PrintBridge] Buffer decodificado: ${bytes.length} bytes`);
        console.log(`[PrintBridge] Primeiros bytes:`, Array.from(bytes.slice(0, 20)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));

        // Envia para impressora
        let success = false;
        let connectionType = '';

        if (this.printMethod === "bematech") {
          console.log('[PrintBridge] 🖨️ Enviando para Bematech User App...');
          connectionType = 'Bematech User App';
          
          const result = await bematechUserClient.print(bytes);
          success = result.success;
          
          if (!success) {
            throw new Error(result.error || "Falha ao enviar para Bematech User");
          }
          console.log('[PrintBridge] ✅ Dados enviados com sucesso para Bematech User');
        } else if (this.isNativeMode) {
          console.log('[PrintBridge] 🔌 Modo OTG Nativo detectado');
          console.log('[PrintBridge] Verificando status da impressora OTG...');
          connectionType = 'OTG Android';
          
          // Verifica se está conectado antes de enviar
          const status = await nativePrintService.getPrinterStatus();
          console.log('[PrintBridge] Status retornado:', JSON.stringify(status, null, 2));
          
          if (!status.connected) {
            console.warn('[PrintBridge] ⚠️ Impressora OTG reportada como desconectada');
            console.warn('[PrintBridge] Tentando reconectar automaticamente...');
            
            try {
              await nativePrintService.connectPrinter();
              console.log('[PrintBridge] ✅ Reconexão bem-sucedida');
            } catch (reconnectError) {
              console.error('[PrintBridge] ❌ Falha na reconexão:', reconnectError);
              throw new Error("Impressora OTG não está conectada e falhou ao reconectar. Conecte a impressora manualmente.");
            }
          } else {
            console.log('[PrintBridge] ✅ Impressora OTG conectada');
            console.log('[PrintBridge] Device ID:', status.deviceId);
            console.log('[PrintBridge] VendorID:', status.vendorId, 'ProductID:', status.productId);
          }
          
          console.log('[PrintBridge] Enviando', bytes.length, 'bytes...');
          success = await nativePrintService.sendRawData(bytes);
          console.log('[PrintBridge] sendRawData retornou:', success);
          
          if (success) {
            console.log('[PrintBridge] ✅ Dados enviados com sucesso via OTG');
          } else {
            console.log('[PrintBridge] ❌ Falha ao enviar via OTG');
          }
        } else {
          // Tenta WebUSB primeiro, depois rede
          if (webusbPrinter.isConnected()) {
            console.log('[PrintBridge] 🔌 Enviando para impressora via WebUSB...');
            connectionType = 'WebUSB';
            await webusbPrinter.print(bytes);
            success = true;
            console.log('[PrintBridge] ✅ Dados enviados com sucesso via WebUSB');
          } else {
            // Tenta impressora Wi-Fi se configurada
            const networkIP = localStorage.getItem('network_printer_ip');
            const networkPort = localStorage.getItem('network_printer_port');
            
            if (networkIP && networkPort) {
              console.log(`[PrintBridge] 🔌 Enviando para impressora via Wi-Fi (${networkIP}:${networkPort})...`);
              connectionType = 'Wi-Fi';
              
              const networkPrinter = new NetworkPrinter(networkIP, parseInt(networkPort));
              const connected = await networkPrinter.connect();
              
              if (connected) {
                await networkPrinter.print(bytes);
                success = true;
                console.log('[PrintBridge] ✅ Dados enviados com sucesso via Wi-Fi');
              } else {
                throw new Error("Não foi possível conectar à impressora Wi-Fi");
              }
            } else {
              throw new Error("Nenhuma impressora conectada (USB ou Wi-Fi)");
            }
          }
        }

        if (success) {
          console.log(`[PrintBridge] ✅ Job ${job.jobId} concluído com sucesso via ${connectionType}`);
          
          // Atualiza status para completed
          await this.updateJobStatus(job.jobId, "completed");
          this.onJobStatusChange?.(job.jobId, "completed");
          
          // Envia resposta de sucesso
          await this.sendJobResponse({
            jobId: job.jobId,
            status: "OK",
            timestamp: Date.now(),
            deviceId: this.deviceId,
          });

          // Salva log local
          this.saveJobLog(job, {
            jobId: job.jobId,
            status: "OK",
            timestamp: Date.now(),
            deviceId: this.deviceId,
          });

          return; // Sucesso, sai do loop
        } else {
          throw new Error("Falha ao enviar dados para impressora");
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[PrintBridge] ❌ Tentativa ${attempt} falhou:`, lastError);

        // Se ainda há tentativas, aguarda antes de tentar novamente
        if (attempt < maxAttempts) {
          const delay = 2000 * attempt;
          console.log(`[PrintBridge] ⏳ Aguardando ${delay}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Todas as tentativas falharam
    console.error(`[PrintBridge] Job ${job.jobId} falhou após ${maxAttempts} tentativas`);
    
    // Atualiza status para failed
    await this.updateJobStatus(job.jobId, "failed", lastError);
    this.onJobStatusChange?.(job.jobId, "failed", lastError);

    // Envia resposta de erro
    const errorResponse: PrintJobResponse = {
      jobId: job.jobId,
      status: "ERROR",
      timestamp: Date.now(),
      deviceId: this.deviceId,
      error: lastError,
    };

    await this.sendJobResponse(errorResponse);
    this.saveJobLog(job, errorResponse);
  }

  /**
   * Atualiza status do job no banco de dados
   */
  private async updateJobStatus(
    jobId: string, 
    status: "processing" | "completed" | "failed",
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc("update_job_status", {
        p_job_id: jobId,
        p_status: status,
        p_error_message: errorMessage || null,
      });

      if (error) {
        console.error("[PrintBridge] Erro ao atualizar status:", error);
      }
    } catch (error) {
      console.error("[PrintBridge] Erro ao chamar update_job_status:", error);
    }
  }

  /**
   * Envia resposta do trabalho para o canal
   */
  private async sendJobResponse(response: PrintJobResponse): Promise<void> {
    if (!this.channel || !this.isConnected) {
      console.warn("[PrintBridge] Canal não conectado, não é possível enviar resposta");
      return;
    }

    try {
      await this.channel.send({
        type: "broadcast",
        event: "print_job_response",
        payload: response,
      });
      console.log("[PrintBridge] Resposta enviada:", response);
    } catch (error) {
      console.error("[PrintBridge] Erro ao enviar resposta:", error);
    }
  }

  /**
   * Salva log do trabalho no localStorage
   */
  private saveJobLog(job: PrintJob, response: PrintJobResponse): void {
    try {
      const logs = JSON.parse(localStorage.getItem("print_bridge_job_logs") || "[]");
      
      const logEntry = {
        jobId: job.jobId,
        timestamp: response.timestamp,
        status: response.status,
        documentType: job.documentType,
        metadata: job.metadata,
        error: response.error,
        deviceId: this.deviceId,
      };

      logs.unshift(logEntry);
      
      // Mantém apenas os últimos 100 logs
      const trimmedLogs = logs.slice(0, 100);
      localStorage.setItem("print_bridge_job_logs", JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error("[PrintBridge] Erro ao salvar log:", error);
    }
  }

  /**
   * Tenta reconectar automaticamente com backoff exponencial
   */
  private async handleReconnect(): Promise<void> {
    // Verifica se deve manter conexão ativa
    if (!this.keepAlive) {
      console.log("[PrintBridge] Keep-alive desativado, não reconecta");
      return;
    }
    
    // Evita múltiplas tentativas simultâneas
    if (this.isReconnecting) {
      console.log("[PrintBridge] Reconexão já em andamento, ignorando...");
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[PrintBridge] ❌ Máximo de tentativas atingido");
      this.onStatusChange?.("disconnected");
      this.isReconnecting = false;
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.onStatusChange?.("reconnecting");
    
    // Backoff exponencial com limite de 10 segundos
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);
    console.log(
      `[PrintBridge] 🔄 Reconectando em ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Não chama disconnect completo para não desativar keepAlive
        if (this.presenceChannel) {
          await supabase.removeChannel(this.presenceChannel);
        }
        if (this.channel) {
          await supabase.removeChannel(this.channel);
        }
        
        await this.connect();
      } catch (error) {
        console.error("[PrintBridge] ❌ Erro na reconexão:", error);
        this.isReconnecting = false;
        // Tenta novamente se keepAlive ainda estiver ativo
        if (this.keepAlive && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.handleReconnect(), 2000);
        }
      }
    }, delay);
  }

  /**
   * Retorna status da conexão
   */
  getStatus(): {
    connected: boolean;
    deviceId: string;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      deviceId: this.deviceId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Obtém logs salvos
   */
  static getJobLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem("print_bridge_job_logs") || "[]");
    } catch {
      return [];
    }
  }

  /**
   * Limpa logs
   */
  static clearJobLogs(): void {
    localStorage.removeItem("print_bridge_job_logs");
  }
}
