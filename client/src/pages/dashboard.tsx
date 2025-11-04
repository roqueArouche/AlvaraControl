import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ExclamationTriangleIcon, 
  BellIcon, 
  ClockIcon, 
  CheckCircledIcon,
  FileTextIcon,
  PlusIcon,
  Pencil1Icon
} from "@radix-ui/react-icons";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { exportDashboardToPDF } from "@/lib/exports";
import { useToast } from "@/hooks/use-toast";
import type { DashboardStats } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleExportPDF = async () => {
    try {
      await exportDashboardToPDF(startDate, endDate);
      toast({
        title: "Exportação iniciada",
        description: "O arquivo PDF será baixado em breve.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o dashboard.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sem Regularização</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-sem-regularizacao">
                  {stats?.semRegularizacao || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Já Notificados</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-notificados">
                  {stats?.notificados || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <BellIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prazo Vencido</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-prazo-vencido">
                  {stats?.prazoVencido || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regulares</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-regulares">
                  {stats?.regulares || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircledIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              {!stats || stats.total === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Nenhum dado para exibir</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Sem Regularização", value: stats.semRegularizacao, color: "#ef4444" },
                        { name: "Notificados", value: stats.notificados, color: "#eab308" },
                        { name: "Prazo Vencido", value: stats.prazoVencido, color: "#dc2626" },
                        { name: "Regulares", value: stats.regulares, color: "#10b981" },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: "Sem Regularização", value: stats.semRegularizacao, color: "#ef4444" },
                        { name: "Notificados", value: stats.notificados, color: "#eab308" },
                        { name: "Prazo Vencido", value: stats.prazoVencido, color: "#dc2626" },
                        { name: "Regulares", value: stats.regulares, color: "#10b981" },
                      ].filter(item => item.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              {!stats || stats.total === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Nenhum dado para exibir</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Sem Regularização", valor: stats.semRegularizacao, color: "#ef4444" },
                      { name: "Notificados", valor: stats.notificados, color: "#eab308" },
                      { name: "Prazo Vencido", valor: stats.prazoVencido, color: "#dc2626" },
                      { name: "Regulares", valor: stats.regulares, color: "#10b981" },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Dashboard Section */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="dashboard-start-date">Data Inicial</Label>
              <Input
                id="dashboard-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-dashboard-start-date"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="dashboard-end-date">Data Final</Label>
              <Input
                id="dashboard-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-dashboard-end-date"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleExportPDF}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-export-pdf"
              >
                <FileTextIcon className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(!stats || stats.total === 0) ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma atividade recente encontrada.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Cadastre novos alvarás para ver as atividades aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <PlusIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Sistema inicializado</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.total} alvarás cadastrados no sistema
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">agora</span>
                </div>
                
                {stats.semRegularizacao > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-red-500/10 rounded-full flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Alvarás sem regularização</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.semRegularizacao} alvarás precisam de atenção
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">hoje</span>
                  </div>
                )}
                
                {stats.notificados > 0 && (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                        <BellIcon className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Contribuintes notificados</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.notificados} notificações enviadas
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">hoje</span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
