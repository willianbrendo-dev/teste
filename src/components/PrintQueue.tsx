import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintQueueItem, PrintQueueStatus } from "@/hooks/use-print-queue";
import { Printer, CheckCircle, XCircle, Loader2, FileText, ClipboardCheck, Receipt, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrintQueueProps {
  queue: PrintQueueItem[];
  onClearCompleted: () => void;
  onClearAll: () => void;
  onRemove: (id: string) => void;
}

/**
 * Componente visual da fila de impressão
 * Mostra os últimos 3 jobs com status
 */
export function PrintQueue({ queue, onClearCompleted, onClearAll, onRemove }: PrintQueueProps) {
  if (queue.length === 0) return null;

  const getStatusIcon = (status: PrintQueueStatus) => {
    switch (status) {
      case 'pending':
        return <Printer className="w-4 h-4 text-muted-foreground" />;
      case 'printing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: PrintQueueStatus) => {
    switch (status) {
      case 'pending':
        return 'Aguardando';
      case 'printing':
        return 'Imprimindo';
      case 'success':
        return 'Concluído';
      case 'error':
        return 'Erro';
    }
  };

  const getStatusColor = (status: PrintQueueStatus) => {
    switch (status) {
      case 'pending':
        return 'border-muted';
      case 'printing':
        return 'border-primary bg-primary/5';
      case 'success':
        return 'border-green-500 bg-green-500/5';
      case 'error':
        return 'border-red-500 bg-red-500/5';
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'ordem':
        return <FileText className="w-4 h-4" />;
      case 'checklist':
        return <ClipboardCheck className="w-4 h-4" />;
      case 'recibo':
        return <Receipt className="w-4 h-4" />;
      default:
        return <Printer className="w-4 h-4" />;
    }
  };

  const getDocumentLabel = (item: PrintQueueItem) => {
    const typeLabel = {
      ordem: 'O.S.',
      checklist: 'Checklist',
      recibo: 'Recibo',
    }[item.documentType];

    if (item.documentNumber) {
      return `${typeLabel} #${item.documentNumber}`;
    }
    return typeLabel;
  };

  const hasCompleted = queue.some(item => item.status === 'success' || item.status === 'error');

  return (
    <Card className="fixed bottom-24 right-6 w-80 shadow-lg z-40 border-2">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <h3 className="font-semibold">Fila de Impressão</h3>
          </div>
          <div className="flex gap-1">
            {hasCompleted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClearCompleted}
                title="Limpar concluídos"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClearAll}
              title="Limpar tudo"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                getStatusColor(item.status)
              )}
            >
              <div className="flex-shrink-0">
                {getDocumentIcon(item.documentType)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {getDocumentLabel(item)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {getStatusIcon(item.status)}
                  <span>{getStatusText(item.status)}</span>
                </div>
                {item.error && (
                  <div className="text-xs text-red-500 mt-1 truncate">
                    {item.error}
                  </div>
                )}
              </div>

              {(item.status === 'success' || item.status === 'error') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => onRemove(item.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Últimos 3 documentos
        </div>
      </div>
    </Card>
  );
}
