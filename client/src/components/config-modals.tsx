import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { insertTipoAlvaraSchema, insertStatusAlvaraSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TipoAlvara, StatusAlvara } from "@shared/schema";

interface TipoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo?: TipoAlvara | null;
}

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: StatusAlvara | null;
}

export function TipoModal({ isOpen, onClose, tipo }: TipoModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertTipoAlvaraSchema>>({
    resolver: zodResolver(insertTipoAlvaraSchema),
    defaultValues: {
      nome: "",
      descricao: "",
    },
  });

  React.useEffect(() => {
    if (tipo && isOpen) {
      form.reset({
        nome: tipo.nome,
        descricao: tipo.descricao || "",
      });
    } else if (!tipo && isOpen) {
      form.reset({
        nome: "",
        descricao: "",
      });
    }
  }, [tipo, isOpen, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertTipoAlvaraSchema>) => {
      if (tipo) {
        return await apiRequest("PUT", `/api/tipos/${tipo.id}`, data);
      } else {
        return await apiRequest("POST", "/api/tipos", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tipos"] });
      toast({
        title: tipo ? "Tipo atualizado" : "Tipo criado",
        description: tipo 
          ? "O tipo de alvará foi atualizado com sucesso." 
          : "Novo tipo de alvará foi criado com sucesso.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o tipo de alvará.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertTipoAlvaraSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="tipo-modal-title">
            {tipo ? "Editar Tipo de Alvará" : "Novo Tipo de Alvará"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo-nome">Nome *</Label>
            <Input
              id="tipo-nome"
              {...form.register("nome")}
              data-testid="input-tipo-nome"
            />
            {form.formState.errors.nome && (
              <p className="text-sm text-destructive">
                {form.formState.errors.nome.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo-descricao">Descrição</Label>
            <Textarea
              id="tipo-descricao"
              rows={3}
              {...form.register("descricao")}
              data-testid="input-tipo-descricao"
            />
            {form.formState.errors.descricao && (
              <p className="text-sm text-destructive">
                {form.formState.errors.descricao.message}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-tipo-cancel"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              data-testid="button-tipo-save"
            >
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StatusModal({ isOpen, onClose, status }: StatusModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertStatusAlvaraSchema>>({
    resolver: zodResolver(insertStatusAlvaraSchema),
    defaultValues: {
      nome: "",
      cor: "#3b82f6",
      descricao: "",
    },
  });

  React.useEffect(() => {
    if (status && isOpen) {
      form.reset({
        nome: status.nome,
        cor: status.cor,
        descricao: status.descricao || "",
      });
    } else if (!status && isOpen) {
      form.reset({
        nome: "",
        cor: "#3b82f6",
        descricao: "",
      });
    }
  }, [status, isOpen, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertStatusAlvaraSchema>) => {
      if (status) {
        return await apiRequest("PUT", `/api/status/${status.id}`, data);
      } else {
        return await apiRequest("POST", "/api/status", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      toast({
        title: status ? "Status atualizado" : "Status criado",
        description: status 
          ? "O status foi atualizado com sucesso." 
          : "Novo status foi criado com sucesso.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar o status.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof insertStatusAlvaraSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="status-modal-title">
            {status ? "Editar Status" : "Novo Status"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status-nome">Nome *</Label>
            <Input
              id="status-nome"
              {...form.register("nome")}
              data-testid="input-status-nome"
            />
            {form.formState.errors.nome && (
              <p className="text-sm text-destructive">
                {form.formState.errors.nome.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-cor">Cor *</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="status-cor"
                type="color"
                {...form.register("cor")}
                className="w-16 h-10 p-1 border-border"
                data-testid="input-status-cor"
              />
              <Input
                type="text"
                value={form.watch("cor")}
                onChange={(e) => form.setValue("cor", e.target.value)}
                className="flex-1"
                placeholder="#3b82f6"
                data-testid="input-status-cor-text"
              />
            </div>
            {form.formState.errors.cor && (
              <p className="text-sm text-destructive">
                {form.formState.errors.cor.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-descricao">Descrição</Label>
            <Textarea
              id="status-descricao"
              rows={3}
              {...form.register("descricao")}
              data-testid="input-status-descricao"
            />
            {form.formState.errors.descricao && (
              <p className="text-sm text-destructive">
                {form.formState.errors.descricao.message}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-status-cancel"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              data-testid="button-status-save"
            >
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
