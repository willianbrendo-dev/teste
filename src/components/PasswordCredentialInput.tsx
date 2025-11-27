import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileImage, Eye, EyeOff } from "lucide-react";

interface PasswordCredentialInputProps {
  value?: string;
  onChange: (value: string) => void;
  senhaDesenhoFile?: File | null;
  onSenhaDesenhoChange?: (file: File | null) => void;
  tipoSenha?: string;
  onTipoSenhaChange?: (tipo: string) => void;
}

export function PasswordCredentialInput({
  value = "",
  onChange,
  senhaDesenhoFile,
  onSenhaDesenhoChange,
  tipoSenha = "LIVRE",
  onTipoSenhaChange,
}: PasswordCredentialInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleTipoChange = (newTipo: string) => {
    console.log("Tipo de senha alterado de", tipoSenha, "para", newTipo);
    
    // Clear data based on selection
    if (newTipo === "PADRAO") {
      onChange(""); // Clear text password
    } else if (newTipo === "LIVRE") {
      if (onSenhaDesenhoChange) {
        onSenhaDesenhoChange(null); // Clear pattern file
      }
    }
    
    // Update parent state
    if (onTipoSenhaChange) {
      onTipoSenhaChange(newTipo);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo-senha">TIPO DE SENHA</Label>
        <Select 
          value={tipoSenha} 
          onValueChange={handleTipoChange}
        >
          <SelectTrigger id="tipo-senha" className="w-full bg-background">
            <SelectValue placeholder="SELECIONE O TIPO" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-popover">
            <SelectItem value="PADRAO">SENHA PADRÃO (DESENHO)</SelectItem>
            <SelectItem value="LIVRE">CAMPO LIVRE (TEXTO)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tipoSenha === "LIVRE" && (
        <div>
          <Label>SENHA/CREDENCIAL</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              placeholder="DIGITE A SENHA OU CREDENCIAL"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {tipoSenha === "PADRAO" && (
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <Label>SENHA DE DESENHO (UPLOAD DE IMAGEM - OPCIONAL)</Label>
          <div className="space-y-2 mt-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                console.log("Arquivo selecionado:", file?.name);
                if (file && onSenhaDesenhoChange) {
                  onSenhaDesenhoChange(file);
                }
              }}
            />
            {senhaDesenhoFile && (
              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                <FileImage className="w-3 h-3" />
                {senhaDesenhoFile.name}
              </Badge>
            )}
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">
              📸 Tire uma foto do padrão desenhado OU deixe em branco - na impressão aparecerão 9 pontinhos para desenhar manualmente
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
