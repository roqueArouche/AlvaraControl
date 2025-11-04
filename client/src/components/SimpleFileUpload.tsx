import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleFileUploadProps {
  onFileSelected?: (file: File) => void;
  onUploadComplete?: (imageUrl: string) => void;
  currentImageUrl?: string;
  className?: string;
}

export function SimpleFileUpload({ 
  onFileSelected, 
  onUploadComplete, 
  currentImageUrl,
  className = "" 
}: SimpleFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || "");
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro", 
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Criar preview e simular upload
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      
      onFileSelected?.(file);

      // Simular upload
      setIsUploading(true);
      try {
        // Por enquanto, simular um upload bem-sucedido
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Manter a data URL para funcionar o preview
        onUploadComplete?.(dataUrl);
        
        toast({
          title: "Sucesso",
          description: "Imagem carregada com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao carregar a imagem.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreviewUrl("");
    onUploadComplete?.("");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label htmlFor="file-upload">Imagem do Local</Label>
      
      {previewUrl ? (
        <div className="relative">
          <div className="relative w-full h-32 bg-muted rounded border overflow-hidden">
            <img
              src={previewUrl}
              alt="Preview da imagem"
              className="w-full h-full object-cover"
              onLoad={() => console.log("Imagem carregada com sucesso")}
              onError={(e) => {
                console.error("Erro ao carregar imagem:", e);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={clearImage}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Adicionar Foto
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG até 10MB
          </p>
        </div>
      )}
    </div>
  );
}