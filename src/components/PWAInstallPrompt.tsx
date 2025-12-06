/**
 * PWA Install Prompt Component
 * Shows a user-friendly prompt to install the app on their device
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      console.log('[PWA] App is already installed');
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user has dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        // Show prompt after a short delay
        setTimeout(() => setShowPrompt(true), 3000);
      }
      console.log('[PWA] Install prompt captured');
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('[PWA] App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show iOS instructions after delay if on iOS and not installed
    if (isIOSDevice) {
      const iosShown = localStorage.getItem('pwa-ios-shown');
      if (!iosShown) {
        setTimeout(() => setShowIOSInstructions(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    console.log('[PWA] Triggering install prompt');
    await deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User choice:', outcome);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-ios-shown', 'true');
    console.log('[PWA] Install prompt dismissed');
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // iOS Instructions
  if (isIOS && showIOSInstructions) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Instalar OrderSistem</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <CardDescription className="text-sm mb-3">
              Para instalar no seu iPhone/iPad:
            </CardDescription>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
                <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
                <span>Confirme tocando em <strong>"Adicionar"</strong></span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Android/Desktop Install Prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Instalar OrderSistem</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <CardDescription className="text-sm mb-4">
              Instale o app para acesso rápido, funcionar offline e ter a melhor experiência!
            </CardDescription>
            <div className="flex gap-2">
              <Button onClick={handleInstall} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Instalar Agora
              </Button>
              <Button variant="outline" onClick={handleDismiss}>
                Depois
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// Compact indicator for showing install status in nav
export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!canInstall) return null;

  return (
    <Button variant="ghost" size="sm" onClick={handleInstall} className="gap-2">
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Instalar</span>
    </Button>
  );
}
