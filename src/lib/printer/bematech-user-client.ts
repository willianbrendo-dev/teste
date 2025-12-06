/**
 * Cliente para comunicação com Servidor Local de Impressão
 * O servidor Node.js local deve estar rodando na porta 9100
 */

interface LocalPrintServerConfig {
  host: string;
  port: number;
  timeout: number;
}

export class BematechUserClient {
  private config: LocalPrintServerConfig;

  constructor(config?: Partial<LocalPrintServerConfig>) {
    this.config = {
      host: config?.host || 'localhost',
      port: config?.port || 9100,
      timeout: config?.timeout || 10000,
    };
  }

  /**
   * Envia dados ESC/POS para o servidor local de impressão
   */
  async print(escposData: Uint8Array): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[LocalPrintServer] Enviando para servidor local...');
      console.log('[LocalPrintServer] URL:', `http://${this.config.host}:${this.config.port}`);
      console.log('[LocalPrintServer] Bytes:', escposData.length);

      // Converte para base64 para envio via HTTP
      const base64Data = this.uint8ArrayToBase64(escposData);

      // Envia via HTTP POST para o servidor local
      const response = await fetch(`http://${this.config.host}:${this.config.port}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: base64Data
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMsg = errorJson.error;
          }
        } catch {
          // Se não for JSON, usa o texto direto
          if (errorText) errorMsg = errorText;
        }
        
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log('[LocalPrintServer] ✅ Impressão enviada com sucesso');
      console.log('[LocalPrintServer] Resposta:', result);
      
      return { success: true };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[LocalPrintServer] ❌ Erro:', errorMsg);
      
      // Verifica se é erro de conexão
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        return { 
          success: false, 
          error: '❌ Servidor local não está rodando. Execute o servidor em local-print-server/ primeiro.' 
        };
      }
      
      // Verifica se é erro de impressora não conectada
      if (errorMsg.includes('não conectada') || errorMsg.includes('not connected')) {
        return { 
          success: false, 
          error: '❌ Impressora não conectada ao servidor local. Conecte a impressora USB.' 
        };
      }
      
      return { 
        success: false, 
        error: `Erro ao imprimir: ${errorMsg}` 
      };
    }
  }


  /**
   * Verifica se o servidor local está disponível e conectado
   */
  async checkConnection(): Promise<{ online: boolean; connected?: boolean; port?: string }> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (!response.ok) {
        return { online: false };
      }
      
      const status = await response.json();
      return {
        online: true,
        connected: status.connected || false,
        port: status.port
      };
    } catch (error) {
      console.log('[LocalPrintServer] Servidor não está respondendo');
      return { online: false };
    }
  }

  /**
   * Lista portas seriais disponíveis no servidor
   */
  async listPorts(): Promise<{ success: boolean; ports?: any[]; error?: string }> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/ports`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      return {
        success: true,
        ports: result.ports || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Conecta a uma porta serial específica
   */
  async connectToPort(port: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ port }),
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao conectar');
      }
      
      const result = await response.json();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao conectar'
      };
    }
  }

  /**
   * Converte Uint8Array para Base64
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Atualiza configuração
   */
  updateConfig(config: Partial<LocalPrintServerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Instância singleton
export const bematechUserClient = new BematechUserClient();
