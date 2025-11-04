import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { insertAlvaraSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MultipleImageUpload } from "./MultipleImageUpload";
import { ImageIcon } from "lucide-react";
import type { AlvaraWithRelations, TipoAlvara, StatusAlvara } from "@shared/schema";

interface AlvaraModalProps {
  isOpen: boolean;
  onClose: () => void;
  alvara?: AlvaraWithRelations | null;
}

const formSchema = insertAlvaraSchema;

export function AlvaraModal({ isOpen, onClose, alvara }: AlvaraModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = React.useState<string[]>([]);

  const { data: tipos = [] } = useQuery<TipoAlvara[]>({
    queryKey: ["/api/tipos"],
  });

  const { data: statusList = [] } = useQuery<StatusAlvara[]>({
    queryKey: ["/api/status"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeContribuinte: "",
      cpf: "",
      endereco: "",
      bairro: "",
      latitude: "",
      longitude: "",
      imagemLocal: "",
      observacoes: "",
      dataNotificacao: "",
      dataVisita: "",
      primeiroPrazo: "",
      segundoPrazo: "",
      tipoLicencaId: "",
      statusId: "",
    },
  });

  React.useEffect(() => {
    if (alvara && isOpen) {
      // Parse imagemLocal to get array of images
      let existingImages: string[] = [];
      if (alvara.imagemLocal) {
        try {
          // Try to parse as JSON array
          const parsed = JSON.parse(alvara.imagemLocal);
          if (Array.isArray(parsed)) {
            existingImages = parsed;
          } else if (typeof parsed === 'string') {
            existingImages = [parsed];
          }
        } catch {
          // If not JSON, treat as single image URL
          existingImages = [alvara.imagemLocal];
        }
      }
      setUploadedImages(existingImages);
      
      form.reset({
        nomeContribuinte: alvara.nomeContribuinte,
        cpf: alvara.cpf,
        endereco: alvara.endereco,
        bairro: alvara.bairro || "",
        latitude: alvara.latitude || "",
        longitude: alvara.longitude || "",
        imagemLocal: alvara.imagemLocal || "",
        observacoes: alvara.observacoes || "",
        dataNotificacao: alvara.dataNotificacao 
          ? new Date(alvara.dataNotificacao).toISOString().split('T')[0] 
          : "",
        dataVisita: alvara.dataVisita 
          ? new Date(alvara.dataVisita).toISOString().split('T')[0] 
          : "",
        primeiroPrazo: alvara.primeiroPrazo 
          ? new Date(alvara.primeiroPrazo).toISOString().split('T')[0] 
          : "",
        segundoPrazo: alvara.segundoPrazo 
          ? new Date(alvara.segundoPrazo).toISOString().split('T')[0] 
          : (alvara.prazoRegularizacao ? new Date(alvara.prazoRegularizacao).toISOString().split('T')[0] : ""),
        tipoLicencaId: alvara.tipoLicencaId || "",
        statusId: alvara.statusId || "",
      });
    } else if (!alvara && isOpen) {
      setUploadedImages([]);
      form.reset({
        nomeContribuinte: "",
        cpf: "",
        endereco: "",
        bairro: "",
        latitude: "",
        longitude: "",
        imagemLocal: "",
        observacoes: "",
        dataNotificacao: "",
        dataVisita: "",
        primeiroPrazo: "",
        segundoPrazo: "",
        tipoLicencaId: "",
        statusId: "",
      });
    }
  }, [alvara, isOpen, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (alvara) {
        return await apiRequest("PUT", `/api/alvaras/${alvara.id}`, data);
      } else {
        return await apiRequest("POST", "/api/alvaras", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alvaras"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: alvara ? "Alvará atualizado" : "Alvará criado",
        description: alvara 
          ? "O alvará foi atualizado com sucesso." 
          : "Novo alvará foi criado com sucesso.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o alvará.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Preserve existing images if not modified
    const imagesToSave = uploadedImages.length > 0 
      ? uploadedImages 
      : (data.imagemLocal ? (() => {
          try {
            const parsed = JSON.parse(data.imagemLocal);
            return Array.isArray(parsed) ? parsed : [data.imagemLocal];
          } catch {
            return [data.imagemLocal];
          }
        })() : []);
    
    const submitData = {
      ...data,
      imagemLocal: imagesToSave.length > 0 ? JSON.stringify(imagesToSave) : "",
    };
    mutation.mutate(submitData);
  };

  const handleImagesChange = (images: string[]) => {
    setUploadedImages(images);
    form.setValue("imagemLocal", images.length > 0 ? JSON.stringify(images) : "");
  };

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '');
    return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] mx-2 md:mx-4 md:w-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {alvara ? "Editar Registro" : "Novo Registro"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="nomeContribuinte">Nome do Contribuinte *</Label>
              <Input
                id="nomeContribuinte"
                {...form.register("nomeContribuinte")}
                data-testid="input-nome-contribuinte"
              />
              {form.formState.errors.nomeContribuinte && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.nomeContribuinte.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                {...form.register("cpf")}
                placeholder="000.000.000-00"
                onChange={(e) => {
                  const formatted = formatCPF(e.target.value);
                  e.target.value = formatted;
                  form.setValue("cpf", formatted);
                }}
                data-testid="input-cpf"
              />
              {form.formState.errors.cpf && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.cpf.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço *</Label>
              <Input
                id="endereco"
                {...form.register("endereco")}
                data-testid="input-endereco"
              />
              {form.formState.errors.endereco && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.endereco.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro *</Label>
              <Input
                id="bairro"
                {...form.register("bairro")}
                data-testid="input-bairro"
              />
              {form.formState.errors.bairro && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.bairro.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataNotificacao">Data da Notificação</Label>
              <Input
                id="dataNotificacao"
                type="date"
                {...form.register("dataNotificacao")}
                data-testid="input-data-notificacao"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataVisita">Data da Visita</Label>
              <Input
                id="dataVisita"
                type="date"
                {...form.register("dataVisita")}
                data-testid="input-data-visita"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primeiroPrazo">Prazo para Comparecimento (1º Prazo)</Label>
              <Input
                id="primeiroPrazo"
                type="date"
                {...form.register("primeiroPrazo")}
                data-testid="input-primeiro-prazo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="segundoPrazo">Prazo para Regularização (2º Prazo)</Label>
              <Input
                id="segundoPrazo"
                type="date"
                {...form.register("segundoPrazo")}
                data-testid="input-segundo-prazo"
              />
              {form.formState.errors.segundoPrazo && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.segundoPrazo.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoLicencaId">Tipo de Licença *</Label>
              <Select 
                value={form.watch("tipoLicencaId") || ""} 
                onValueChange={(value) => form.setValue("tipoLicencaId", value)}
              >
                <SelectTrigger data-testid="select-tipo-licenca">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.tipoLicencaId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.tipoLicencaId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusId">Status *</Label>
              <Select 
                value={form.watch("statusId") || ""} 
                onValueChange={(value) => form.setValue("statusId", value)}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statusList.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.statusId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.statusId.message}
                </p>
              )}
            </div>

            {/* Upload de Múltiplas Imagens */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <MultipleImageUpload
                currentImages={uploadedImages}
                onImagesChange={handleImagesChange}
                maxImages={3}
                maxSizePerImageMB={5}
              />
            </div>

            {/* Campo de Observações */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                {...form.register("observacoes")}
                placeholder="Digite Observações"
                maxLength={500}
                rows={3}
                data-testid="textarea-observacoes"
              />
              {form.formState.errors.observacoes && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.observacoes.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {form.watch("observacoes")?.length || 0}/500 caracteres
              </p>
            </div>

            {/* Coordenadas removidas - Google Maps API não está disponível */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="text"
                  {...form.register("latitude")}
                  placeholder="Ex: -13.2744"
                  data-testid="input-latitude"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="text"
                  {...form.register("longitude")}
                  placeholder="Ex: -39.6383"
                  data-testid="input-longitude"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              data-testid="button-save"
            >
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
