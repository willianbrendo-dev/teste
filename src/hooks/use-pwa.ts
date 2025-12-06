/**
 * Hook for PWA functionality and service worker management
 */

import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { pwaLogger } from '@/lib/offline/debug-logger';
import { toast } from 'sonner';

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  needsRefresh: boolean;
  offlineReady: boolean;
  swStatus: 'installing' | 'waiting' | 'active' | 'redundant' | 'unknown';
}

export function usePWA() {
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    isOnline: navigator.onLine,
    needsRefresh: false,
    offlineReady: false,
    swStatus: 'unknown'
  });

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(registration) {
      pwaLogger.logSWEvent('registered', { scope: registration?.scope });
      
      // Check service worker status
      if (registration?.active) {
        setStatus(prev => ({ ...prev, swStatus: 'active' }));
      } else if (registration?.installing) {
        setStatus(prev => ({ ...prev, swStatus: 'installing' }));
      } else if (registration?.waiting) {
        setStatus(prev => ({ ...prev, swStatus: 'waiting' }));
      }

      // Periodic update check every hour
      if (registration) {
        setInterval(() => {
          pwaLogger.logSWEvent('checking for updates');
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      pwaLogger.error('SW', 'Registration failed', error);
    },
    onNeedRefresh() {
      pwaLogger.logPWAEvent('update available');
      setStatus(prev => ({ ...prev, needsRefresh: true }));
      toast.info('Atualização disponível', {
        description: 'Uma nova versão está disponível. Clique para atualizar.',
        action: {
          label: 'Atualizar',
          onClick: () => updateServiceWorker(true)
        },
        duration: 10000
      });
    },
    onOfflineReady() {
      pwaLogger.logPWAEvent('offline ready');
      setStatus(prev => ({ ...prev, offlineReady: true }));
      toast.success('App pronto para uso offline', {
        description: 'O aplicativo pode funcionar sem internet.'
      });
    }
  });

  // Check if installed/standalone
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    
    setStatus(prev => ({
      ...prev,
      isInstalled: isStandalone,
      isStandalone
    }));

    pwaLogger.logPWAEvent('display mode check', { isStandalone });
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      pwaLogger.logNetworkEvent('online');
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      pwaLogger.logNetworkEvent('offline');
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update status when needRefresh/offlineReady change
  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      needsRefresh: needRefresh,
      offlineReady: offlineReady
    }));
  }, [needRefresh, offlineReady]);

  const refresh = useCallback(() => {
    pwaLogger.logPWAEvent('manual refresh triggered');
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const checkForUpdates = useCallback(async () => {
    pwaLogger.logSWEvent('manual update check');
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.update();
    }
  }, []);

  return {
    ...status,
    refresh,
    checkForUpdates
  };
}

// Hook for monitoring service worker lifecycle
export function useServiceWorker() {
  const [swState, setSwState] = useState<ServiceWorkerState | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      pwaLogger.warn('SW', 'Service Worker not supported');
      return;
    }

    const updateState = () => {
      navigator.serviceWorker.ready.then(registration => {
        const sw = registration.active;
        if (sw) {
          setSwState(sw.state);
          pwaLogger.logSWEvent('state update', { state: sw.state });
        }
      });
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      pwaLogger.logSWEvent('controller changed');
      updateState();
    });

    updateState();
  }, []);

  return { swState };
}
