import { useState, useRef } from "react";
import { Camera, X, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CameraPhotoCaptureProps {
  onPhotosChange: (files: File[]) => void;
  currentPhotos: File[];
  currentPreviews: string[];
  onRemovePhoto: (index: number) => void;
  maxPhotos?: number;
}

export function CameraPhotoCapture({
  onPhotosChange,
  currentPhotos,
  currentPreviews,
  onRemovePhoto,
  maxPhotos = 6
}: CameraPhotoCaptureProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas imagens');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    const preview = URL.createObjectURL(file);
    setPendingPhoto({ file, preview });
    setShowConfirmDialog(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmPhoto = () => {
    if (pendingPhoto) {
      const newPhotos = [...currentPhotos, pendingPhoto.file];
      onPhotosChange(newPhotos);
      URL.revokeObjectURL(pendingPhoto.preview);
      setPendingPhoto(null);
    }
    setShowConfirmDialog(false);
  };

  const handleDiscardPhoto = () => {
    if (pendingPhoto) {
      URL.revokeObjectURL(pendingPhoto.preview);
      setPendingPhoto(null);
    }
    setShowConfirmDialog(false);
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={triggerCamera}
          disabled={currentPhotos.length >= maxPhotos}
          className="flex-1"
        >
          <Camera className="w-4 h-4 mr-2" />
          Tirar Foto
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []);
              const validFiles = files.filter(f => {
                if (!f.type.startsWith('image/')) return false;
                if (f.size > 5 * 1024 * 1024) return false;
                return true;
              }).slice(0, maxPhotos - currentPhotos.length);
              
              if (validFiles.length > 0) {
                onPhotosChange([...currentPhotos, ...validFiles]);
              }
            };
            input.click();
          }}
          disabled={currentPhotos.length >= maxPhotos}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Galeria
        </Button>
      </div>

      {currentPreviews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {currentPreviews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={preview}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover rounded-md border border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => onRemovePhoto(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Foto</DialogTitle>
          </DialogHeader>
          {pendingPhoto && (
            <div className="space-y-4">
              <img
                src={pendingPhoto.preview}
                alt="Preview"
                className="w-full rounded-md border border-border"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleDiscardPhoto}
                >
                  <X className="w-4 h-4 mr-2" />
                  Descartar
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleConfirmPhoto}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Anexar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
