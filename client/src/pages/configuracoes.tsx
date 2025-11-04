import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { PlusIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { TipoModal, StatusModal } from "@/components/config-modals";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TipoAlvara, StatusAlvara } from "@shared/schema";

export default function Configuracoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTipoModalOpen, setIsTipoModalOpen] = React.useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
  const [editingTipo, setEditingTipo] = React.useState<TipoAlvara | null>(null);
  const [editingStatus, setEditingStatus] = React.useState<StatusAlvara | null>(null);

  const { data: tipos = [], isLoading: isLoadingTipos } = useQuery<TipoAlvara[]>({
    queryKey: ["/api/tipos"],
  });

  const { data: statusList = [], isLoading: isLoadingStatus } = useQuery<StatusAlvara[]>({
    queryKey: ["/api/status"],
  });

  // Delete mutations
  const deleteTipoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/tipos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tipos"] });
      toast({
        title: "Tipo excluído",
        description: "O tipo de alvará foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o tipo de alvará.",
        variant: "destructive",
      });
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/status/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      toast({
        title: "Status excluído",
        description: "O status foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o status.",
        variant: "destructive",
      });
    },
  });

  const handleEditTipo = (tipo: TipoAlvara) => {
    setEditingTipo(tipo);
    setIsTipoModalOpen(true);
  };

  const handleEditStatus = (status: StatusAlvara) => {
    setEditingStatus(status);
    setIsStatusModalOpen(true);
  };

  const handleNewTipo = () => {
    setEditingTipo(null);
    setIsTipoModalOpen(true);
  };

  const handleNewStatus = () => {
    setEditingStatus(null);
    setIsStatusModalOpen(true);
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
      
      {/* Tipos de Alvarás */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tipos de Alvarás</CardTitle>
            <Button 
              onClick={handleNewTipo}
              data-testid="button-new-tipo"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Adicionar Tipo
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTipos ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <p>Nenhum tipo de alvará cadastrado.</p>
                      <p className="text-sm mt-1">Clique em "Adicionar Tipo" para começar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {tipo.descricao || 'Sem descrição'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditTipo(tipo)}
                          data-testid={`button-edit-tipo-${tipo.id}`}
                        >
                          <Pencil1Icon className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este tipo?")) {
                              deleteTipoMutation.mutate(tipo.id);
                            }
                          }}
                          disabled={deleteTipoMutation.isPending}
                          data-testid={`button-delete-tipo-${tipo.id}`}
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status de Alvarás */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status de Alvarás</CardTitle>
            <Button 
              onClick={handleNewStatus}
              data-testid="button-new-status"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Adicionar Status
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingStatus ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : statusList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <p>Nenhum status cadastrado.</p>
                      <p className="text-sm mt-1">Clique em "Adicionar Status" para começar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                statusList.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell>
                      <Badge 
                        className="px-2 py-1 text-xs font-medium"
                        style={{ 
                          backgroundColor: `${status.cor}20`, 
                          color: status.cor,
                          border: `1px solid ${status.cor}40`
                        }}
                      >
                        {status.nome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: status.cor }}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {status.descricao || 'Sem descrição'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStatus(status)}
                          data-testid={`button-edit-status-${status.id}`}
                        >
                          <Pencil1Icon className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este status?")) {
                              deleteStatusMutation.mutate(status.id);
                            }
                          }}
                          disabled={deleteStatusMutation.isPending}
                          data-testid={`button-delete-status-${status.id}`}
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <TipoModal
        isOpen={isTipoModalOpen}
        onClose={() => setIsTipoModalOpen(false)}
        tipo={editingTipo}
      />

      <StatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        status={editingStatus}
      />
    </div>
  );
}
