import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { nativePrintService } from "./print-service-native";
import { bematechUserClient } from "./bematech-user-client";
import { printService } from "./print-service";
import { webusbPrinter } from "./webusb";
import { NetworkPrinter } from "./network-printer";
import { PrintLanguageFallback, PrintLanguage } from "./escbema-commands";

export interface PrintJob {
  jobId: string;
  action: "print";
  escposDataBase64: string;
  documentType?: "service_order" | "checklist" | "receipt" | "custom";
  metadata?: {
    ordemId?: string;
    checklistId?: string;
    description?: string;
    requesterId?: string;
    requesterRole?: string;
  };
}

export interface PrintJobResponse {
  jobId: string;
  status: "OK" | "ERROR";
  timestamp: number;
  deviceId: string;
  error?: string;
  printLanguage?: PrintLanguage;
  connectionType?: string;
  processingTimeMs?: number;
}

export interface DeviceRegistration {
  role: "PRINT_BRIDGE";
  action: "online" | "offline";
  deviceId: string;
  timestamp: number;
  deviceInfo?: string;
}

export interface PrintJobLog {
  jobId: string;
  timestamp: number;
  status: "OK" | "ERROR";
  documentType?: string;
  metadata?: any;
  error?: string;
  deviceId: string;
  printLanguage?: PrintLanguage;
  connectionType?: string;
  processingTimeMs?: number;
  attempts?: number;
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
  private onJobStatusChange?: (jobId: string, status: "processing" | "completed" | "failed", error?: string, language?: PrintLanguage) => void;
  private isProcessing: boolean = false;
  private jobQueue: PrintJob[] = [];
  private printMethod: "usb" | "wifi" | "bematech" = "usb";
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private keepAlive: boolean = true;
  private queueCheckInterval: NodeJS.Timeout | null = null;
  private printTimeout: number = 10000; // 10s timeout para fallback

  constructor(
    deviceId: string,
    isNativeMode: boolean = false,
    callbacks?: {
      onJobReceived?: (job: PrintJob) => void;
      onStatusChange?: (status: "connected" | "disconnected" | "reconnecting") => void;
      onJobStatusChange?: (jobId: string, status: "processing" | "completed" | "failed", error?: string, language?: PrintLanguage) => void;
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
          console.log("[PrintBridge] ===== BROADCAST RECEBIDO =====");
          console.log("[PrintBridge] Timestamp:", new Date().toISOString());
          console.log("[PrintBridge] Device ID atual:", this.deviceId);
          console.log("[PrintBridge] Payload completo:", JSON.stringify(payload, null, 2));
          
          // O payload vem em payload.payload quando enviado via broadcast
          const job = payload.payload || payload;
          
          console.log("[PrintBridge] Job extraído:", {
            jobId: job.jobId?.slice(0, 8) + "...",
            osId: job.osId,
            deviceId: job.deviceId,
            hasData: !!job.escposDataBase64,
            dataLength: job.escposDataBase64?.length || 0
          });
          
          // Verifica se o job é para este dispositivo
          if (!job.deviceId || job.deviceId === this.deviceId) {
            console.log("[PrintBridge] ✅ Job aceito! Processando...");
            await this.handlePrintJob({
              jobId: job.jobId,
              action: "print",
              escposDataBase64: job.escposDataBase64,
              documentType: job.documentType,
              metadata: job.metadata
            });
          } else {
            console.log("[PrintBridge] ❌ Job ignorado - destinado para outro device:", job.deviceId);
          }
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
   * Inicia heartbeat para manter conexão ativa (reduzido para 45s)
   */
  private startHeartbeat(): void {
    // Limpa heartbeat anterior
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Envia heartbeat a cada 45 segundos (reduz overhead)
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
          console.log("[PrintBridge] 💓 Heartbeat");
        } catch (error) {
          console.error("[PrintBridge] Erro no heartbeat:", error);
        }
      }
    }, 45000);
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
   * Inicia verificação periódica da fila (reduzido para 30s)
   */
  private startQueueCheck(): void {
    // Limpa verificação anterior
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
    }
    
    // Verifica fila a cada 30 segundos (reduzido overhead)
    this.queueCheckInterval = setInterval(async () => {
      if (this.isConnected && !this.isProcessing) {
        console.log("[PrintBridge] 🔍 Verificação periódica da fila...");
        await this.processQueuedJobs();
      }
    }, 30000);
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
      
      // Busca próximo job pendente para este dispositivo OU jobs com pending_device
      const { data: jobs, error } = await supabase
        .from('print_jobs')
        .select('id, job_id, os_id, escpos_data_base64, device_id, attempts')
        .in('device_id', [this.deviceId, 'pending_device'])
        .eq('status', 'pending')
        .lt('attempts', 3)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error("[PrintBridge] Erro ao buscar job da fila:", error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        console.log("[PrintBridge] ✓ Nenhum job pendente na fila");
        return;
      }

      const job = jobs[0];
      console.log("[PrintBridge] 📋 Job encontrado na fila:", {
        jobId: job.job_id.slice(0, 8) + "...",
        osId: job.os_id,
        deviceId: job.device_id,
        attempt: (job.attempts || 0) + 1
      });

      // Se o job era para pending_device, atualiza para este dispositivo
      if (job.device_id === 'pending_device') {
        console.log("[PrintBridge] 📋 Assumindo job de pending_device para:", this.deviceId);
        await supabase
          .from('print_jobs')
          .update({ device_id: this.deviceId })
          .eq('job_id', job.job_id);
      }

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
   * Processa um único job com retry automático e fallback ESC/BEMA
   */
  private async processJob(job: PrintJob): Promise<void> {
    const maxAttempts = 2; // 2 tentativas conforme especificação
    let attempt = 0;
    let lastError: string | undefined;
    let usedLanguage: PrintLanguage = 'escpos';
    let connectionType = '';
    const startTime = Date.now();

    // Atualiza status para processing
    await this.updateJobStatus(job.jobId, "processing");
    this.onJobStatusChange?.(job.jobId, "processing");

    console.log(`[PrintBridge] ===== INICIANDO PROCESSAMENTO DE JOB =====`);
    console.log(`[PrintBridge] Job ID: ${job.jobId}`);
    console.log(`[PrintBridge] Tipo: ${job.documentType || 'custom'}`);
    console.log(`[PrintBridge] Modo: ${this.isNativeMode ? 'OTG Android' : 'WebUSB/Wi-Fi'}`);
    console.log(`[PrintBridge] Solicitante: ${job.metadata?.requesterId || 'N/A'}`);
    console.log(`[PrintBridge] Timeout configurado: ${this.printTimeout}ms`);

    // Obtém linguagem preferida
    const preferredLanguage = PrintLanguageFallback.getPreferredLanguage(this.deviceId);
    console.log(`[PrintBridge] Linguagem preferida: ${preferredLanguage}`);

    // Decodifica base64 para Uint8Array uma única vez
    const binaryString = atob(job.escposDataBase64);
    const originalBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      originalBytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`[PrintBridge] Buffer decodificado: ${originalBytes.length} bytes`);
    console.log(`[PrintBridge] Primeiros bytes:`, Array.from(originalBytes.slice(0, 20)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));

    // Define ordem de tentativa de linguagens
    const languagesToTry: PrintLanguage[] = preferredLanguage === 'escbema' 
      ? ['escbema', 'escpos'] 
      : ['escpos', 'escbema'];

    while (attempt < maxAttempts) {
      attempt++;
      
      // Escolhe linguagem para esta tentativa
      usedLanguage = languagesToTry[attempt - 1] || 'escpos';
      
      console.log(`[PrintBridge] ========================================`);
      console.log(`[PrintBridge] Tentativa ${attempt}/${maxAttempts} para job ${job.jobId}`);
      console.log(`[PrintBridge] Linguagem: ${usedLanguage.toUpperCase()}`);
      console.log(`[PrintBridge] ========================================`);

      try {
        // Converte dados para a linguagem escolhida
        const bytes = PrintLanguageFallback.convertToLanguage(originalBytes, usedLanguage);
        console.log(`[PrintBridge] Dados convertidos para ${usedLanguage}: ${bytes.length} bytes`);

        // Envia para impressora com timeout
        let success = false;
        
        const printPromise = this.executePrint(bytes);
        const timeoutPromise = new Promise<{ success: false; connectionType: string; error: string }>((resolve) => {
          setTimeout(() => {
            resolve({ 
              success: false, 
              connectionType: 'timeout',
              error: `Timeout de ${this.printTimeout}ms excedido` 
            });
          }, this.printTimeout);
        });

        const result = await Promise.race([printPromise, timeoutPromise]);
        success = result.success;
        connectionType = result.connectionType;

        if (!success) {
          throw new Error(result.error || "Falha ao enviar dados para impressora");
        }

        // SUCESSO!
        const processingTime = Date.now() - startTime;
        console.log(`[PrintBridge] ✅ Job ${job.jobId} concluído com sucesso`);
        console.log(`[PrintBridge] Linguagem: ${usedLanguage}`);
        console.log(`[PrintBridge] Conexão: ${connectionType}`);
        console.log(`[PrintBridge] Tempo: ${processingTime}ms`);

        // Salva linguagem bem-sucedida para uso futuro
        PrintLanguageFallback.saveSuccessfulLanguage(usedLanguage, this.deviceId);

        // Atualiza status para completed
        await this.updateJobStatus(job.jobId, "completed");
        this.onJobStatusChange?.(job.jobId, "completed", undefined, usedLanguage);

        // Envia resposta de sucesso
        await this.sendJobResponse({
          jobId: job.jobId,
          status: "OK",
          timestamp: Date.now(),
          deviceId: this.deviceId,
          printLanguage: usedLanguage,
          connectionType,
          processingTimeMs: processingTime,
        });

        // Salva log local completo
        this.saveJobLog(job, {
          jobId: job.jobId,
          status: "OK",
          timestamp: Date.now(),
          deviceId: this.deviceId,
          printLanguage: usedLanguage,
          connectionType,
          processingTimeMs: processingTime,
          attempts: attempt,
        } as PrintJobLog);

        return; // Sucesso, sai do método

      } catch (error) {
        lastError = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[PrintBridge] ❌ Tentativa ${attempt} falhou (${usedLanguage}):`, lastError);

        // Se ainda há tentativas e próxima linguagem é diferente, tenta fallback
        if (attempt < maxAttempts) {
          const nextLanguage = languagesToTry[attempt];
          console.log(`[PrintBridge] 🔄 Tentando fallback para ${nextLanguage?.toUpperCase()}...`);
          
          const delay = 2000;
          console.log(`[PrintBridge] ⏳ Aguardando ${delay}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Todas as tentativas falharam
    const processingTime = Date.now() - startTime;
    console.error(`[PrintBridge] ❌ Job ${job.jobId} falhou após ${maxAttempts} tentativas`);
    console.error(`[PrintBridge] Último erro: ${lastError}`);
    console.error(`[PrintBridge] Tempo total: ${processingTime}ms`);

    // Atualiza status para failed
    await this.updateJobStatus(job.jobId, "failed", lastError);
    this.onJobStatusChange?.(job.jobId, "failed", lastError, usedLanguage);

    // Envia resposta de erro
    const errorResponse: PrintJobResponse = {
      jobId: job.jobId,
      status: "ERROR",
      timestamp: Date.now(),
      deviceId: this.deviceId,
      error: lastError,
      printLanguage: usedLanguage,
      connectionType,
      processingTimeMs: processingTime,
    };

    await this.sendJobResponse(errorResponse);
    this.saveJobLog(job, {
      ...errorResponse,
      documentType: job.documentType,
      metadata: job.metadata,
      attempts: maxAttempts,
    } as PrintJobLog);
  }

  /**
   * Executa a impressão no método configurado
   */
  private async executePrint(bytes: Uint8Array): Promise<{ success: boolean; connectionType: string; error?: string }> {
    try {
      if (this.printMethod === "bematech") {
        console.log('[PrintBridge] 🖨️ Enviando para Bematech User App...');
        
        const result = await bematechUserClient.print(bytes);
        
        return {
          success: result.success,
          connectionType: 'Bematech User App',
          error: result.error
        };
      }
      
      if (this.isNativeMode) {
        console.log('[PrintBridge] 🔌 Modo OTG Nativo detectado');
        console.log('[PrintBridge] Verificando status da impressora OTG...');
        
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
            return {
              success: false,
              connectionType: 'OTG Android',
              error: "Impressora OTG não conectada"
            };
          }
        } else {
          console.log('[PrintBridge] ✅ Impressora OTG conectada');
        }
        
        console.log('[PrintBridge] Enviando', bytes.length, 'bytes...');
        const success = await nativePrintService.sendRawData(bytes);
        
        return {
          success,
          connectionType: 'OTG Android',
          error: success ? undefined : "Falha ao enviar via OTG"
        };
      }
      
      // Tenta WebUSB primeiro, depois rede
      if (webusbPrinter.isConnected()) {
        console.log('[PrintBridge] 🔌 Enviando para impressora via WebUSB...');
        await webusbPrinter.print(bytes);
        return { success: true, connectionType: 'WebUSB' };
      }
      
      // Tenta impressora Wi-Fi se configurada
      const networkIP = localStorage.getItem('network_printer_ip');
      const networkPort = localStorage.getItem('network_printer_port');
      
      if (networkIP && networkPort) {
        console.log(`[PrintBridge] 🔌 Enviando para impressora via Wi-Fi (${networkIP}:${networkPort})...`);
        
        const networkPrinter = new NetworkPrinter(networkIP, parseInt(networkPort));
        const connected = await networkPrinter.connect();
        
        if (connected) {
          await networkPrinter.print(bytes);
          return { success: true, connectionType: 'Wi-Fi' };
        } else {
          return { success: false, connectionType: 'Wi-Fi', error: "Não foi possível conectar à impressora Wi-Fi" };
        }
      }
      
      return { success: false, connectionType: 'none', error: "Nenhuma impressora conectada (USB ou Wi-Fi)" };
      
    } catch (error) {
      return {
        success: false,
        connectionType: 'unknown',
        error: error instanceof Error ? error.message : "Erro desconhecido"
      };
    }
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
  private saveJobLog(job: PrintJob, response: PrintJobLog | PrintJobResponse): void {
    try {
      const logs = JSON.parse(localStorage.getItem("print_bridge_job_logs") || "[]");
      
      const logEntry: PrintJobLog = {
        jobId: job.jobId,
        timestamp: response.timestamp,
        status: response.status,
        documentType: job.documentType,
        metadata: job.metadata,
        error: response.error,
        deviceId: this.deviceId,
        printLanguage: 'printLanguage' in response ? response.printLanguage : undefined,
        connectionType: 'connectionType' in response ? response.connectionType : undefined,
        processingTimeMs: 'processingTimeMs' in response ? response.processingTimeMs : undefined,
        attempts: 'attempts' in response ? response.attempts : undefined,
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
