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
          
          localStorage.setItem("print_bridge_last_online", new Date().toISOString());
          
          // Inicia heartbeat para manter presença ativa
          this.startHeartbeat();
          
          // Inicia verificação de fila
          this.startQueueCheck();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("[PrintBridge] ⚠️ Erro no canal de presença:", status);
          if (this.keepAlive) {
            await this.handleReconnect();
          }
        }
      });

      // =================================================================
      // CANAL DE JOBS (HÍBRIDO: BROADCAST + BANCO DE DADOS)
      // =================================================================
      this.channel = supabase.channel("print_bridge_jobs", {
        config: {
          broadcast: { ack: true, self: false },
        },
      });

      // 1. ESCUTA VIA BROADCAST (Rápido)
      this.channel.on(
        "broadcast",
        { event: "print_job" },
        async (payload) => {
          console.log("⚡ [PrintBridge] Recebido via BROADCAST");
          const rawJob = payload.payload || payload;
          await this.processIncomingPayload(rawJob);
        }
      );

      // 2. ESCUTA VIA BANCO DE DADOS (Tanque de Guerra - Seguro)
      // Se a timeline atualiza, ISSO AQUI VAI DISPARAR A IMPRESSÃO!
      this.channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "print_jobs",
          filter: `device_id=eq.${this.deviceId}`, // Filtra só o que for pra mim
        },
        async (payload) => {
          console.log("💾 [PrintBridge] Recebido via BANCO DE DADOS (Insert)");
          console.log("Dados do banco:", payload.new);
          await this.processIncomingPayload(payload.new);
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
          await this.processQueuedJobs();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.isConnected = false;
          this.onStatusChange?.("disconnected");
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
   * FUNÇÃO UNIFICADA PARA PROCESSAR PACOTES (Broadcast ou DB)
   * Resolve o problema de nomes diferentes (Snake Case vs Camel Case)
   */
  private async processIncomingPayload(rawJob: any): Promise<void> {
    try {
      // Normalização de nomes (A mágica que conserta o erro)
      const escposData = rawJob.escposDataBase64 || rawJob.escpos_data_base64 || rawJob.escposBase64;
      const targetJobId = rawJob.jobId || rawJob.job_id || rawJob.id;
      const targetOsId = rawJob.osId || rawJob.os_id;
      const targetDeviceId = rawJob.deviceId || rawJob.device_id;
      
      // Se veio do banco, o status pode ser 'pending'. Se já estiver completed/processing, ignora
      if (rawJob.status && rawJob.status !== 'pending') {
        return;
      }

      // Verificação de segurança básica
      if (!escposData) {
        console.error("[PrintBridge] ❌ DADOS VAZIOS! O Base64 não chegou no pacote.");
        return;
      }

      // Verificação de ID (Se for diferente, ignora. Se for nulo ou igual, aceita)
      if (targetDeviceId && targetDeviceId !== this.deviceId) {
         console.log(`[PrintBridge] Ignorando job para outro device: ${targetDeviceId}`);
         return;
      }

      console.log(`[PrintBridge] 🚀 Processando Job ID: ${targetJobId}`);
      console.log(`[PrintBridge] Tamanho dos dados: ${escposData.length}`);

      await this.handlePrintJob({
        jobId: targetJobId,
        action: "print",
        escposDataBase64: escposData,
        documentType: rawJob.documentType || "service_order",
        metadata: rawJob.metadata || { ordemId: targetOsId }
      });
    } catch (e) {
      console.error("[PrintBridge] Erro ao processar payload recebido:", e);
    }
  }
  
  /**
   * Inicia heartbeat para manter conexão ativa
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
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
        } catch (error) {
          console.error("[PrintBridge] Erro no heartbeat:", error);
        }
      }
    }, 30000);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  private startQueueCheck(): void {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
    }
    this.queueCheckInterval = setInterval(async () => {
      if (this.isConnected && !this.isProcessing) {
        await this.processQueuedJobs();
      }
    }, 10000);
  }
  
  private stopQueueCheck(): void {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
      this.queueCheckInterval = null;
    }
  }
  
  private async processQueuedJobs(): Promise<void> {
    if (this.isProcessing) return;

    try {
      // Busca próximo job pendente para este dispositivo
      const { data, error } = await supabase.rpc("get_next_pending_job", {
        p_device_id: this.deviceId
      });

      if (error || !data || (Array.isArray(data) && data.length === 0)) return;

      const jobs = Array.isArray(data) ? data : [data];
      const job = jobs[0];

      console.log("[PrintBridge] 📋 Job encontrado na fila (polling):", job.job_id);

      await this.processIncomingPayload(job);

    } catch (error) {
      console.error("[PrintBridge] Erro ao processar fila:", error);
    }
  }

  async disconnect(): Promise<void> {
    console.log("[PrintBridge] 🔌 Desconectando...");
    this.keepAlive = false;
    this.stopHeartbeat();
    this.stopQueueCheck();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
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
  }

  private async handlePrintJob(job: PrintJob): Promise<void> {
    this.onJobReceived?.(job);
    this.jobQueue.push(job);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) return;

    this.isProcessing = true;
    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift()!;
      await this.processJob(job);
    }
    this.isProcessing = false;
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

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`[PrintBridge] Tentativa ${attempt}/${maxAttempts}`);

      try {
        // =====================================================================
        // 🧪 MODO TESTE FORÇADO (O Cavalo de Troia)
        // =====================================================================
        // Vamos ignorar o Base64 que veio do servidor por enquanto.
        // Vamos criar um buffer manual simples, igual o botão de teste faria.
        
        console.log("🧪 [TESTE] Gerando buffer de teste manual (ignorando servidor)...");
        
        // Comandos ESC/POS simples: [Reset] [Texto] [Cortar]
        const encoder = new TextEncoder();
        const texto = encoder.encode("\n\n=== TESTE DE REALTIME ===\nSe voce esta lendo isso,\na conexao com o PC funcionou!\n========================\n\n\n");
        
        // Comandos hexadecimais (Reset + Texto + Cortar)
        const init = new Uint8Array([0x1B, 0x40]); 
        const cut = new Uint8Array([0x1D, 0x56, 0x41, 0x10]);
        
        // Junta tudo num array só
        const bytes = new Uint8Array(init.length + texto.length + cut.length);
        bytes.set(init, 0);
        bytes.set(texto, init.length);
        bytes.set(cut, init.length + texto.length);
        
        console.log(`🧪 [TESTE] Buffer manual criado com ${bytes.length} bytes.`);
        // =====================================================================

        // Envia para impressora
        let success = false;
        let connectionType = '';

        if (this.isNativeMode) {
          console.log('[PrintBridge] 🔌 Modo OTG Nativo - Tentando enviar...');
          
          // Verifica status antes
          const status = await nativePrintService.getPrinterStatus();
          if (!status.connected) {
             console.log('[PrintBridge] ⚠️ Desconectado, tentando reconectar...');
             await nativePrintService.connectPrinter();
          }
          
          // Envia os bytes manuais
          success = await nativePrintService.sendRawData(bytes);
          connectionType = 'OTG Android (Teste Forçado)';
        } else {
            // Se for WebUSB (Testar no PC)
             if (webusbPrinter.isConnected()) {
                await webusbPrinter.print(bytes);
                success = true;
                connectionType = 'WebUSB';
             }
        }

        if (success) {
          console.log(`[PrintBridge] ✅ SUCESSO! O teste forçado imprimiu!`);
          
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

          return; // Sucesso, sai do loop
        } else {
          throw new Error("O driver da impressora retornou falha (false)");
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[PrintBridge] ❌ Falha na tentativa ${attempt}:`, lastError);

        if (attempt < maxAttempts) {
          const delay = 2000 * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Falhou todas as tentativas
    await this.updateJobStatus(job.jobId, "failed", lastError);
    this.onJobStatusChange?.(job.jobId, "failed", lastError);
  }

  private async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    try {
      await supabase.rpc("update_job_status", { p_job_id: jobId, p_status: status, p_error_message: errorMessage || null });
    } catch (e) { console.error(e); }
  }

  private async sendJobResponse(response: PrintJobResponse): Promise<void> {
    if (!this.channel || !this.isConnected) return;
    try {
      await this.channel.send({ type: "broadcast", event: "print_job_response", payload: response });
    } catch (e) { console.error(e); }
  }

  private saveJobLog(job: PrintJob, response: PrintJobResponse): void {
    try {
      const logs = JSON.parse(localStorage.getItem("print_bridge_job_logs") || "[]");
      logs.unshift({ jobId: job.jobId, timestamp: response.timestamp, status: response.status, documentType: job.documentType, metadata: job.metadata, error: response.error, deviceId: this.deviceId });
      localStorage.setItem("print_bridge_job_logs", JSON.stringify(logs.slice(0, 100)));
    } catch (e) { console.error(e); }
  }

  private async handleReconnect(): Promise<void> {
    if (!this.keepAlive || this.isReconnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatusChange?.("disconnected");
      this.isReconnecting = false;
      return;
    }
    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.onStatusChange?.("reconnecting");
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 10000);
    this.reconnectTimeout = setTimeout(async () => {
      try {
        if (this.presenceChannel) await supabase.removeChannel(this.presenceChannel);
        if (this.channel) await supabase.removeChannel(this.channel);
        await this.connect();
      } catch {
        this.isReconnecting = false;
        if (this.keepAlive && this.reconnectAttempts < this.maxReconnectAttempts) setTimeout(() => this.handleReconnect(), 2000);
      }
    }, delay);
  }

  getStatus() { return { connected: this.isConnected, deviceId: this.deviceId, reconnectAttempts: this.reconnectAttempts }; }
  static getJobLogs() { try { return JSON.parse(localStorage.getItem("print_bridge_job_logs") || "[]"); } catch { return []; } }
  static clearJobLogs() { localStorage.removeItem("print_bridge_job_logs"); }
}