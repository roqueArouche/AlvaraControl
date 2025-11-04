import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultipleImageUploadProps {
  onImagesChange?: (images: string[]) => void;
  currentImages?: string[];
  maxImages?: number;
  maxSizePerImageMB?: number;
  className?: string;
}

export function MultipleImageUpload({ 
  onImagesChange, 
  currentImages = [],
  maxImages = 3,
  maxSizePerImageMB = 5,
  className = "" 
}: MultipleImageUploadProps) {
  const [images, setImages] = useState<string[]>(currentImages);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Atualizar quando currentImages muda (ex: ao editar um alvará)
  useEffect(() => {
    setImages(currentImages);
  }, [currentImages]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validar número máximo de imagens
    if (images.length + files.length > maxImages) {
      toast({
        title: "Limite excedido",
        description: `Você pode adicionar no máximo ${maxImages} imagens.`,
        variant: "destructive",
      });
      return;
    }

    const maxSizeBytes = maxSizePerImageMB * 1024 * 1024;
    const newImages: string[] = [];

    setIsUploading(true);

    try {
      for (const file of files) {
        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Arquivo inválido",
            description: `"${file.name}" não é uma imagem válida.`,
            variant: "destructive",
          });
          continue;
        }

        // Validar tamanho
        if (file.size > maxSizeBytes) {
          toast({
            title: "Arquivo muito grande",
            description: `"${file.name}" excede o limite de ${maxSizePerImageMB}MB.`,
            variant: "destructive",
          });
          continue;
        }

        // Converter para Data URL
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newImages.push(dataUrl);
      }

      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange?.(updatedImages);

        toast({
          title: "Sucesso",
          description: `${newImages.length} imagem(ns) adicionada(s).`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar as imagens.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Limpar o input para permitir adicionar o mesmo arquivo novamente
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange?.(updatedImages);
    toast({
      title: "Imagem removida",
      description: "A imagem foi removida com sucesso.",
    });
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="multiple-file-upload">
          Imagens do Local ({images.length}/{maxImages})
        </Label>
        {images.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Clique no X para remover
          </span>
        )}
      </div>
      
      {/* Preview das imagens existentes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((imageUrl, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-24 bg-muted rounded border overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                  disabled={isUploading}
                  data-testid={`button-remove-image-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão para adicionar mais imagens */}
      {canAddMore && (
        <div className="space-y-2">
          <Input
            id="multiple-file-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
            data-testid="input-multiple-file-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('multiple-file-upload')?.click()}
            disabled={isUploading}
            className="w-full sm:w-auto"
            data-testid="button-add-images"
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Adicionar {images.length > 0 ? 'Mais ' : ''}Foto{images.length === 0 ? 's' : ''}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG, JPG até {maxSizePerImageMB}MB cada. Máximo {maxImages} imagens.
          </p>
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-muted-foreground">
          Limite de {maxImages} imagens atingido.
        </p>
      )}
    </div>
  );
}
