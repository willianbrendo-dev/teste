/**
 * Offline indicator component - shows sync status and pending changes
 */

import { useOffline } from '@/hooks/use-offline';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Check, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, syncStatus, pendingCount, forceSync } = useOffline();

  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="h-4 w-4 text-destructive" />;
    }
    
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'idle':
        return pendingCount > 0 
          ? <Cloud className="h-4 w-4 text-yellow-500" />
          : <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Wifi className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline - Dados salvos localmente';
    
    switch (syncStatus) {
      case 'syncing':
        return 'Sincronizando...';
      case 'error':
        return `Erro na sincronização (${pendingCount} pendentes)`;
      case 'idle':
        return pendingCount > 0 
          ? `${pendingCount} alteração(ões) pendente(s)`
          : 'Sincronizado';
      default:
        return 'Conectado';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 h-8 px-2",
              !isOnline && "text-destructive",
              syncStatus === 'error' && "text-destructive"
            )}
            onClick={() => isOnline && forceSync()}
            disabled={!isOnline || syncStatus === 'syncing'}
          >
            {getStatusIcon()}
            {pendingCount > 0 && (
              <Badge 
                variant={isOnline ? "secondary" : "destructive"} 
                className="h-5 px-1.5 text-xs"
              >
                {pendingCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getStatusText()}</p>
          {isOnline && pendingCount > 0 && (
            <p className="text-xs text-muted-foreground">Clique para sincronizar</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Full offline banner for when completely offline
export function OfflineBanner() {
  const { isOnline, pendingCount, syncStatus } = useOffline();

  // Show when offline or when there's a sync error
  if (isOnline && syncStatus !== 'error') return null;

  const isError = isOnline && syncStatus === 'error';

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm",
      isError 
        ? "bg-yellow-500/90 text-yellow-950" 
        : "bg-destructive text-destructive-foreground"
    )}>
      <div className="flex items-center justify-center gap-2">
        {isError ? (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>
              Erro ao sincronizar. {pendingCount} alteração(ões) pendente(s).
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>
              Você está offline. Os dados são salvos localmente.
            </span>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pendente(s)
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Compact sync status for embedding in other components
export function SyncStatusBadge() {
  const { isOnline, syncStatus, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0 && syncStatus === 'idle') {
    return null;
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
      !isOnline && "bg-destructive/10 text-destructive",
      syncStatus === 'syncing' && "bg-primary/10 text-primary",
      syncStatus === 'error' && "bg-yellow-500/10 text-yellow-600",
      pendingCount > 0 && isOnline && syncStatus === 'idle' && "bg-yellow-500/10 text-yellow-600"
    )}>
      {!isOnline && <CloudOff className="h-3 w-3" />}
      {syncStatus === 'syncing' && <RefreshCw className="h-3 w-3 animate-spin" />}
      {syncStatus === 'error' && <AlertCircle className="h-3 w-3" />}
      {pendingCount > 0 && isOnline && syncStatus === 'idle' && <Cloud className="h-3 w-3" />}
      <span>
        {!isOnline && 'Offline'}
        {syncStatus === 'syncing' && 'Sincronizando...'}
        {syncStatus === 'error' && `${pendingCount} erro(s)`}
        {pendingCount > 0 && isOnline && syncStatus === 'idle' && `${pendingCount} pendente(s)`}
      </span>
    </div>
  );
}
