import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Confirmation Modal Component - rendered via portal to ensure it appears above everything
const ConfirmCloseModal = ({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/80"
      style={{ 
        zIndex: 99999, 
        isolation: 'isolate',
        pointerEvents: 'auto'
      }}
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      <div 
        className="bg-background border border-border rounded-lg p-6 max-w-sm mx-4 shadow-lg"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold uppercase mb-2">CONFIRMAR FECHAMENTO</h3>
        <p className="text-sm text-muted-foreground uppercase mb-4">
          TEM CERTEZA QUE DESEJA FECHAR? AS ALTERAÇÕES NÃO SALVAS SERÃO PERDIDAS.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted uppercase cursor-pointer"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 uppercase cursor-pointer"
          >
            SIM, FECHAR
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface DialogContextValue {
  requestClose: () => void;
  showCloseConfirmation: boolean;
}

const DialogContext = React.createContext<DialogContextValue>({
  requestClose: () => {},
  showCloseConfirmation: true,
});

interface DialogProps extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, 'onOpenChange'> {
  showCloseConfirmation?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Dialog = ({ 
  showCloseConfirmation = true, 
  onOpenChange, 
  open,
  children,
  ...props 
}: DialogProps) => {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(open ?? false);
  const historyPushedRef = React.useRef(false);
  const dialogIdRef = React.useRef(`dialog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const isOpen = open !== undefined ? open : internalOpen;

  // Sync internal state with external open prop
  React.useEffect(() => {
    if (open !== undefined) {
      setInternalOpen(open);
    }
  }, [open]);

  const requestClose = React.useCallback(() => {
    if (showCloseConfirmation) {
      setShowConfirm(true);
    } else {
      setInternalOpen(false);
      onOpenChange?.(false);
    }
  }, [showCloseConfirmation, onOpenChange]);

  const handleConfirmClose = React.useCallback(() => {
    setShowConfirm(false);
    // Remove history entry if we pushed one
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      // Go back to remove our history entry
      window.history.back();
    }
    setInternalOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleCancelClose = React.useCallback(() => {
    setShowConfirm(false);
    // Re-push history state if it was consumed by back button
    if (!historyPushedRef.current && isOpen) {
      window.history.pushState({ dialogOpen: true, dialogId: dialogIdRef.current }, '');
      historyPushedRef.current = true;
    }
  }, [isOpen]);

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (newOpen) {
      setInternalOpen(true);
      onOpenChange?.(true);
    } else {
      // Block automatic close - must use requestClose
      // This prevents closing via overlay or escape
    }
  }, [onOpenChange]);

  // Handle back navigation interception
  React.useEffect(() => {
    if (isOpen) {
      // Push a history state when dialog opens
      if (!historyPushedRef.current) {
        window.history.pushState({ dialogOpen: true, dialogId: dialogIdRef.current }, '');
        historyPushedRef.current = true;
      }

      const handlePopState = (event: PopStateEvent) => {
        // Check if this is our dialog's history entry being popped
        if (historyPushedRef.current) {
          historyPushedRef.current = false;
          // Trigger the same confirmation flow as the X button
          requestClose();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // Dialog closed - cleanup
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        // Remove our history entry if dialog was closed programmatically
        window.history.back();
      }
    }
  }, [isOpen, requestClose]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
      }
    };
  }, []);

  const contextValue = React.useMemo(() => ({
    requestClose,
    showCloseConfirmation,
  }), [requestClose, showCloseConfirmation]);

  return (
    <DialogContext.Provider value={contextValue}>
      <DialogPrimitive.Root 
        open={isOpen} 
        onOpenChange={handleOpenChange} 
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
      <ConfirmCloseModal
        open={showConfirm}
        onCancel={handleCancelClose}
        onConfirm={handleConfirmClose}
      />
    </DialogContext.Provider>
  );
};

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { requestClose } = React.useContext(DialogContext);

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestClose();
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6",
          "[&_label]:uppercase [&_input]:uppercase [&_textarea]:uppercase [&_select]:uppercase",
          className,
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={handleCloseClick}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight uppercase", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground uppercase", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
