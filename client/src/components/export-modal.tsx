import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/lib/exports";
import { useToast } from "@/hooks/use-toast";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToExcel(startDate, endDate);
      toast({
        title: "Exportação iniciada",
        description: "O arquivo Excel será baixado em breve.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="export-modal-title">
            Exportar para Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-start-date">Data Inicial</Label>
            <Input
              id="export-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              data-testid="input-export-start-date"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="export-end-date">Data Final</Label>
            <Input
              id="export-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              data-testid="input-export-end-date"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-export-cancel"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-export-confirm"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
