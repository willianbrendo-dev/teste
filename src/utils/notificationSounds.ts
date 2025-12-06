/**
 * Sistema de notificações sonoras usando Web Audio API
 * Gera sons sintetizados sem necessidade de arquivos externos
 */

class NotificationSounds {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private lastSoundTime: Map<string, number> = new Map();
  private readonly minSoundInterval = 2000; // 2 segundos entre sons do mesmo tipo

  constructor() {
    // Inicializa AudioContext apenas quando necessário
    if (typeof window !== 'undefined') {
      this.enabled = localStorage.getItem('print_bridge_sounds_enabled') !== 'false';
    }
  }

  /**
   * Verifica se pode tocar o som (anti-spam)
   */
  private canPlaySound(soundType: string): boolean {
    if (!this.enabled) return false;
    
    const now = Date.now();
    const lastTime = this.lastSoundTime.get(soundType) || 0;
    
    if (now - lastTime < this.minSoundInterval) {
      return false;
    }
    
    this.lastSoundTime.set(soundType, now);
    return true;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Toca um som de notificação de job recebido
   */
  playJobReceived() {
    if (!this.canPlaySound('jobReceived')) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Tom ascendente (notificação positiva)
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(440, now); // A4
      oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.error('Erro ao tocar som de job recebido:', error);
    }
  }

  /**
   * Toca um som de sucesso (impressão concluída)
   */
  playSuccess() {
    if (!this.canPlaySound('success')) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Dois tons ascendentes (conclusão bem-sucedida)
      const playTone = (freq: number, start: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(freq, start);
        gainNode.gain.setValueAtTime(0.2, start);
        gainNode.gain.exponentialRampToValueAtTime(0.01, start + 0.15);

        oscillator.start(start);
        oscillator.stop(start + 0.15);
      };

      playTone(523.25, now); // C5
      playTone(659.25, now + 0.1); // E5
    } catch (error) {
      console.error('Erro ao tocar som de sucesso:', error);
    }
  }

  /**
   * Toca um som de erro (impressão falhou)
   */
  playError() {
    if (!this.canPlaySound('error')) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Tom descendente (erro/falha)
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(440, now); // A4
      oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.2); // A3

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.error('Erro ao tocar som de erro:', error);
    }
  }

  /**
   * Toca um som de processamento (job sendo processado)
   */
  playProcessing() {
    if (!this.canPlaySound('processing')) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Tom curto (início de processamento)
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(330, now); // E4
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } catch (error) {
      console.error('Erro ao tocar som de processamento:', error);
    }
  }

  /**
   * Ativa/desativa sons
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('print_bridge_sounds_enabled', enabled.toString());
  }

  /**
   * Retorna se os sons estão ativos
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Limpa recursos
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton
export const notificationSounds = new NotificationSounds();
