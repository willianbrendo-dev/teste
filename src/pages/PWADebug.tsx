/**
 * PWA Debug Page - for troubleshooting offline/sync issues
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Download, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Database, 
  Cloud,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { pwaLogger, getConnectionInfo } from '@/lib/offline/debug-logger';
import { useOffline } from '@/hooks/use-offline';
import { usePWA } from '@/hooks/use-pwa';
import { offlineDb } from '@/lib/offline/db';
import { toast } from 'sonner';

export default function PWADebug() {
  const { isOnline, syncStatus, pendingCount, forceSync } = useOffline();
  const { isInstalled, isStandalone, needsRefresh, offlineReady, swStatus, refresh, checkForUpdates } = usePWA();
  const [logs, setLogs] = useState<any[]>([]);
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [connectionInfo, setConnectionInfo] = useState<any>({});

  useEffect(() => {
    loadLogs();
    loadDbStats();
    setConnectionInfo(getConnectionInfo());

    // Update connection info periodically
    const interval = setInterval(() => {
      setConnectionInfo(getConnectionInfo());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadLogs = () => {
    const storedLogs = pwaLogger.getStoredLogs();
    setLogs(storedLogs.slice(-50).reverse());
  };

  const loadDbStats = async () => {
    try {
      const stats: Record<string, number> = {
        ordens_servico: await offlineDb.ordens_servico.count(),
        clientes: await offlineDb.clientes.count(),
        checklists: await offlineDb.checklists.count(),
        garantias: await offlineDb.garantias.count(),
        transacoes: await offlineDb.transacoes.count(),
        caixa_diario: await offlineDb.caixa_diario.count(),
        sync_queue: await offlineDb.sync_queue.count(),
        cached_lookups: await offlineDb.cached_lookups.count(),
      };
      setDbStats(stats);
    } catch (error) {
      console.error('Error loading DB stats:', error);
    }
  };

  const handleClearLogs = () => {
    pwaLogger.clearLogs();
    setLogs([]);
    toast.success('Logs limpos');
  };

  const handleExportLogs = () => {
    const data = pwaLogger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pwa-debug-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exportados');
  };

  const handleForceSync = async () => {
    const result = await forceSync();
    toast.info(`Sincronizado: ${result.synced}, Erros: ${result.failed}`);
    loadDbStats();
    loadLogs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'installing': return 'bg-yellow-500';
      case 'waiting': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen p-4 pb-24">
      <h1 className="text-2xl font-bold mb-4">Debug PWA</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {connectionInfo.type || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <Badge variant={syncStatus === 'error' ? 'destructive' : 'secondary'}>
              {syncStatus}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount} pendente(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Instalação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <Badge variant={isInstalled ? 'default' : 'secondary'}>
              {isInstalled ? 'Instalado' : 'Web'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {isStandalone ? 'Standalone' : 'Browser'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(swStatus)}`} />
              Service Worker
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <Badge variant="secondary">{swStatus}</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {offlineReady ? 'Offline pronto' : 'Carregando...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mb-4">
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Ações</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleForceSync} disabled={!isOnline}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Sincronizar
          </Button>
          <Button size="sm" variant="outline" onClick={() => checkForUpdates()}>
            <Cloud className="h-4 w-4 mr-1" />
            Verificar Atualizações
          </Button>
          {needsRefresh && (
            <Button size="sm" onClick={() => refresh()}>
              <Download className="h-4 w-4 mr-1" />
              Atualizar App
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card className="mb-4">
        <CardHeader className="p-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Cache Local (IndexedDB)
          </CardTitle>
          <CardDescription className="text-xs">
            Dados armazenados localmente
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(dbStats).map(([table, count]) => (
              <div key={table} className="flex justify-between p-2 bg-muted rounded">
                <span className="truncate">{table}</span>
                <Badge variant="secondary" className="ml-2">{count}</Badge>
              </div>
            ))}
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="mt-2 w-full" 
            onClick={loadDbStats}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Logs ({logs.length})
            </CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={loadLogs}>
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleExportLogs}>
                <Download className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleClearLogs}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64">
            <div className="p-3 space-y-1">
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum log registrado
                </p>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className="text-xs p-2 bg-muted rounded font-mono"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {log.level === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                      {log.level === 'warn' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                      {log.level === 'info' && <CheckCircle className="h-3 w-3 text-blue-500" />}
                      <span className="text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1">
                        {log.category}
                      </Badge>
                    </div>
                    <p className="break-all">{log.message}</p>
                    {log.data && (
                      <pre className="text-[10px] text-muted-foreground mt-1 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
