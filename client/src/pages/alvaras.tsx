import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  PlusIcon, 
  Pencil1Icon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  DownloadIcon
} from "@radix-ui/react-icons";
import { MapPin, FileSpreadsheet, ChevronDown, ChevronRight, Calendar, User, Home, FileText } from "lucide-react";
import { AlvaraModal } from "@/components/alvara-modal";
import { ExportModal } from "@/components/export-modal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AlvaraWithRelations, StatusAlvara } from "@shared/schema";

export default function Alvaras() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("");
  const [sortBy, setSortBy] = React.useState("data-desc");
  const [isAlvaraModalOpen, setIsAlvaraModalOpen] = React.useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [editingAlvara, setEditingAlvara] = React.useState<AlvaraWithRelations | null>(null);
  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());
  const [imageModalSrc, setImageModalSrc] = React.useState<string | null>(null);

  // Query for alvaras with filters
  const { data: alvaras = [], isLoading } = useQuery<AlvaraWithRelations[]>({
    queryKey: ["/api/alvaras", { search, statusFilter, dateFilter, sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      console.log('[FRONTEND] Building query params:', { search, statusFilter, dateFilter, sortBy });
      
      // Filtro de pesquisa
      if (search && search.trim()) {
        params.append('search', search);
      }
      
      // Filtro de status - NÃO adiciona se estiver vazio (mostra todos)
      if (statusFilter && statusFilter.trim() !== '' && statusFilter !== 'all') {
        console.log('[FRONTEND] Adding status filter:', statusFilter);
        params.append('status', statusFilter);
      } else {
        console.log('[FRONTEND] NO status filter (showing all records)');
      }
      
      // Filtro de data
      if (dateFilter && dateFilter.trim()) {
        params.append('startDate', dateFilter);
      }
      
      // Ordenação - sempre envia valores válidos
      const [field, order] = sortBy.split('-');
      if (field && order) {
        params.append('sortBy', field);
        params.append('sortOrder', order);
      } else {
        // Padrão: mais recente primeiro
        params.append('sortBy', 'data');
        params.append('sortOrder', 'desc');
      }
      
      const url = `/api/alvaras?${params.toString()}`;
      console.log('[FRONTEND] Calling API URL:', url);
      const response = await fetch(url);
      console.log('[FRONTEND] Response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      console.log('[FRONTEND] Received data, count:', data.length);
      return data;
    },
  });

  // Query for status options
  const { data: statusOptions = [] } = useQuery<StatusAlvara[]>({
    queryKey: ["/api/status"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/alvaras/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alvaras"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Alvará excluído",
        description: "O alvará foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o alvará.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (alvara: AlvaraWithRelations) => {
    setEditingAlvara(alvara);
    setIsAlvaraModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este alvará?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewAlvara = () => {
    setEditingAlvara(null);
    setIsAlvaraModalOpen(true);
  };


  const getPrazoClass = (prazoRegularizacao: string | Date) => {
    const prazo = new Date(prazoRegularizacao);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (prazo < now) return 'prazo-vencido';
    if (prazo <= thirtyDaysFromNow) return 'prazo-proximo';
    return '';
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const toggleCardExpansion = (alvaraId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(alvaraId)) {
      newExpanded.delete(alvaraId);
    } else {
      newExpanded.add(alvaraId);
    }
    setExpandedCards(newExpanded);
  };

  // Mobile compact view component
  const MobileAlvaraCard = ({ alvara }: { alvara: AlvaraWithRelations }) => {
    const isExpanded = expandedCards.has(alvara.id);
    
    return (
      <Card className="mb-2 border border-border bg-card">
        {/* Header - always visible */}
        <div 
          className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleCardExpansion(alvara.id)}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left side - Status badge and expand icon */}
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              <Badge 
                style={{
                  backgroundColor: alvara.status?.cor || '#6b7280',
                  color: '#ffffff',
                  borderColor: alvara.status?.cor || '#6b7280'
                }}
                className="px-2 py-1 text-xs font-medium border flex-shrink-0"
              >
                {alvara.status?.nome || 'Sem status'}
              </Badge>
            </div>

            {/* Center - Main info */}
            <div className="flex-1 min-w-0 px-2">
              <p className="font-medium text-sm text-foreground truncate">{alvara.nomeContribuinte}</p>
              <div className="text-xs text-muted-foreground">
                {alvara.primeiroPrazo && (
                  <p>1º Prazo: {formatDate(alvara.primeiroPrazo)}</p>
                )}
                {(alvara.segundoPrazo || alvara.prazoRegularizacao) && (
                  <p>2º Prazo: {formatDate(alvara.segundoPrazo || alvara.prazoRegularizacao)}</p>
                )}
                {!alvara.primeiroPrazo && !alvara.segundoPrazo && !alvara.prazoRegularizacao && (
                  <p>Sem prazos definidos</p>
                )}
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(alvara);
                }}
                data-testid={`button-edit-${alvara.id}`}
              >
                <Pencil1Icon className="h-3 w-3 text-blue-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  alert("Funcionalidade de mapa será implementada");
                }}
                data-testid={`button-location-${alvara.id}`}
              >
                <MapPin className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(alvara.id);
                }}
                data-testid={`button-delete-${alvara.id}`}
              >
                <TrashIcon className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-border bg-muted/10">
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">CPF</p>
                <p className="text-sm text-foreground">{alvara.cpf}</p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tipo</p>
                <p className="text-sm text-foreground">{alvara.tipoLicenca?.nome || '-'}</p>
              </div>

              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Endereço</p>
                <p className="text-sm text-foreground">{alvara.endereco}</p>
                <p className="text-sm text-muted-foreground">{alvara.bairro}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Data Notificação</p>
                <p className="text-sm text-foreground">{formatDate(alvara.dataNotificacao)}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Data Visita</p>
                <p className="text-sm text-foreground">{formatDate(alvara.dataVisita)}</p>
              </div>

              {alvara.observacoes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Observações</p>
                  <p className="text-sm text-foreground break-words">{alvara.observacoes}</p>
                </div>
              )}

              {alvara.imagemLocal && (() => {
                // Parse imagemLocal - pode ser string simples, Data URL ou JSON array
                let images: string[] = [];
                try {
                  const parsed = JSON.parse(alvara.imagemLocal);
                  if (Array.isArray(parsed)) {
                    images = parsed;
                  } else if (typeof parsed === 'string') {
                    images = [parsed];
                  }
                } catch {
                  // Se não é JSON, é uma string simples
                  images = [alvara.imagemLocal];
                }

                if (images.length === 0) return null;

                return (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {images.length > 1 ? `Imagens do Local (${images.length})` : 'Imagem do Local'}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {images.map((img, idx) => {
                        const imgSrc = img.startsWith('data:') || img.startsWith('http') 
                          ? img 
                          : `/objects/${img}`;
                        
                        return (
                          <div 
                            key={idx}
                            className="relative w-full h-20 bg-muted rounded border overflow-hidden cursor-pointer"
                            onClick={() => setImageModalSrc(imgSrc)}
                            data-testid={`image-${alvara.id}-${idx}`}
                          >
                            <img
                              src={imgSrc}
                              alt={`Imagem do local ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-muted">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                              <div className="bg-white/90 rounded-full p-1">
                                <MagnifyingGlassIcon className="h-3 w-3 text-black" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Search bar - full width on mobile */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, CPF ou endereço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            {/* Filters row - stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-40"
                data-testid="input-date-filter"
              />
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-sort-by">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data-desc">Cadastro (mais recente)</SelectItem>
                  <SelectItem value="nome-asc">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {(search || statusFilter || dateFilter) && (
                <Button 
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setDateFilter("");
                  }}
                  variant="outline"
                  data-testid="button-clear-filters"
                >
                  Limpar Filtros
                </Button>
              )}
              <Button 
                onClick={() => setIsExportModalOpen(true)}
                variant="outline"
                className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Button 
                onClick={handleNewAlvara}
                data-testid="button-new-alvara"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card View for all screen sizes */}
      <div>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="mb-2 border border-border">
              <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-muted rounded animate-pulse mb-2 w-20"></div>
                    <div className="h-4 bg-muted rounded animate-pulse mb-1 w-32"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-24"></div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : alvaras.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-6 text-center">
              <div className="text-muted-foreground">
                <p>Nenhum alvará encontrado.</p>
                <p className="text-sm mt-1">
                  {search || statusFilter || dateFilter 
                    ? "Tente ajustar os filtros de pesquisa." 
                    : "Comece cadastrando um novo alvará."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alvaras.map((alvara) => (
              <MobileAlvaraCard key={alvara.id} alvara={alvara} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination placeholder */}
      {alvaras.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {alvaras.length} registro(s)
          </p>
        </div>
      )}

      {/* Modals */}
      <AlvaraModal
        isOpen={isAlvaraModalOpen}
        onClose={() => setIsAlvaraModalOpen(false)}
        alvara={editingAlvara}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Image View Modal */}
      <Dialog open={!!imageModalSrc} onOpenChange={(open) => { if (!open) setImageModalSrc(null); }}>
        <DialogContent className="max-w-4xl w-11/12 max-h-[90vh] p-2">
          <DialogHeader className="px-4 pb-2">
            <DialogTitle>Imagem do Local</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-hidden">
            {imageModalSrc && (
              <img
                src={imageModalSrc}
                alt="Imagem do local ampliada"
                className="max-w-full max-h-[75vh] object-contain rounded"
                data-testid="modal-image-large"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            )}
            <div className="hidden flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p>Não foi possível carregar a imagem</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
