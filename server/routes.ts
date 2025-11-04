import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAlvaraSchema, insertTipoAlvaraSchema, insertStatusAlvaraSchema } from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      
      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username } 
      });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Verificar e atualizar prazos automaticamente antes de buscar estatísticas
      await storage.verificarEAtualizarPrazos();
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar estatísticas" });
    }
  });

  // Alvaras routes
  app.get("/api/alvaras", async (req, res) => {
    try {
      console.log('[GET /api/alvaras] Step 1: Starting request');
      const { search, status, startDate, endDate, sortBy, sortOrder } = req.query;
      console.log('[GET /api/alvaras] Step 2: Query params extracted');
      
      // Buscar todos os alvarás
      console.log('[GET /api/alvaras] Step 3: Calling storage.getAllAlvaras()');
      let alvaras = await storage.getAllAlvaras();
      console.log('[GET /api/alvaras] Step 4: Received', alvaras.length, 'records');
      
      // Se não houver alvarás, retorna array vazio
      if (!alvaras || alvaras.length === 0) {
        console.log('[GET /api/alvaras] Step 5: No records found, returning empty array');
        return res.json([]);
      }
      
      // Filtro de pesquisa por texto
      console.log('[GET /api/alvaras] Step 6: Applying search filter');
      if (search && typeof search === 'string' && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        alvaras = alvaras.filter(a =>
          a.nomeContribuinte?.toLowerCase().includes(searchLower) ||
          a.cpf?.toLowerCase().includes(searchLower) ||
          a.endereco?.toLowerCase().includes(searchLower) ||
          a.bairro?.toLowerCase().includes(searchLower)
        );
        console.log('[GET /api/alvaras] After search filter:', alvaras.length, 'records');
      }
      
      // Filtro de status (aplica apenas se tiver valor e não for "all")
      console.log('[GET /api/alvaras] Step 7: Applying status filter');
      if (status && typeof status === 'string' && status.trim() && status !== 'all') {
        alvaras = alvaras.filter(a => a.statusId === status);
        console.log('[GET /api/alvaras] After status filter:', alvaras.length, 'records');
      }
      
      // Filtro de data
      console.log('[GET /api/alvaras] Step 8: Applying date filter');
      if (startDate && typeof startDate === 'string' && startDate.trim()) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        if (endDate && typeof endDate === 'string' && endDate.trim()) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          alvaras = alvaras.filter(a => {
            if (!a.createdAt) return false;
            const created = new Date(a.createdAt);
            return created >= start && created <= end;
          });
        } else {
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          alvaras = alvaras.filter(a => {
            if (!a.createdAt) return false;
            const created = new Date(a.createdAt);
            return created >= start && created <= end;
          });
        }
        console.log('[GET /api/alvaras] After date filter:', alvaras.length, 'records');
      }
      
      // Ordenação
      console.log('[GET /api/alvaras] Step 9: Sorting records');
      const sort = sortBy === 'nome' ? 'nome' : 'data';
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      console.log('[GET /api/alvaras] Sort params:', { sort, order });
      
      try {
        alvaras.sort((a, b) => {
          let result = 0;
          
          if (sort === 'nome') {
            const nomeA = (a.nomeContribuinte || '').toLowerCase();
            const nomeB = (b.nomeContribuinte || '').toLowerCase();
            result = nomeA < nomeB ? -1 : nomeA > nomeB ? 1 : 0;
          } else {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            result = dateA - dateB;
          }
          
          return order === 'asc' ? result : -result;
        });
        console.log('[GET /api/alvaras] Step 10: Sorting complete');
      } catch (sortError) {
        console.error('[GET /api/alvaras] ERROR during sort:', sortError);
        // Continue mesmo se ordenação falhar
      }
      
      console.log('[GET /api/alvaras] Step 11: Sending response with', alvaras.length, 'records');
      res.json(alvaras);
    } catch (error) {
      console.error('[GET /api/alvaras] CRITICAL ERROR:', error);
      console.error('[GET /api/alvaras] Error name:', error instanceof Error ? error.name : 'unknown');
      console.error('[GET /api/alvaras] Error message:', error instanceof Error ? error.message : 'unknown');
      console.error('[GET /api/alvaras] Error stack:', error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({ 
        message: "Erro ao buscar alvarás",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/alvaras/:id", async (req, res) => {
    try {
      const alvara = await storage.getAlvaraById(req.params.id);
      if (!alvara) {
        return res.status(404).json({ message: "Alvará não encontrado" });
      }
      res.json(alvara);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar alvará" });
    }
  });

  app.post("/api/alvaras", async (req, res) => {
    try {
      // Transformar strings vazias em null para campos opcionais
      // Deixar strings vazias em campos obrigatórios para que Zod faça a validação
      const processedBody = {
        ...req.body,
        // Campos opcionais - converter string vazia para null
        dataNotificacao: req.body.dataNotificacao === "" ? null : req.body.dataNotificacao,
        dataVisita: req.body.dataVisita === "" ? null : req.body.dataVisita,
        primeiroPrazo: req.body.primeiroPrazo === "" ? null : req.body.primeiroPrazo,
        segundoPrazo: req.body.segundoPrazo === "" ? null : req.body.segundoPrazo,
        imagemLocal: req.body.imagemLocal === "" ? null : req.body.imagemLocal,
        observacoes: req.body.observacoes === "" ? null : req.body.observacoes,
        latitude: req.body.latitude === "" ? null : req.body.latitude,
        longitude: req.body.longitude === "" ? null : req.body.longitude,
        // Campos obrigatórios - converter string vazia para undefined para falhar na validação
        tipoLicencaId: req.body.tipoLicencaId === "" ? undefined : req.body.tipoLicencaId,
        statusId: req.body.statusId === "" ? undefined : req.body.statusId,
      };
      
      const validatedData = insertAlvaraSchema.parse(processedBody);
      const alvara = await storage.createAlvara(validatedData);
      res.status(201).json(alvara);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar alvará" });
    }
  });

  app.put("/api/alvaras/:id", async (req, res) => {
    try {
      // Transformar strings vazias em null para campos opcionais
      const processedBody = {
        ...req.body,
        // Campos opcionais - converter string vazia para null
        dataNotificacao: req.body.dataNotificacao === "" ? null : req.body.dataNotificacao,
        dataVisita: req.body.dataVisita === "" ? null : req.body.dataVisita,
        primeiroPrazo: req.body.primeiroPrazo === "" ? null : req.body.primeiroPrazo,
        segundoPrazo: req.body.segundoPrazo === "" ? null : req.body.segundoPrazo,
        imagemLocal: req.body.imagemLocal === "" ? null : req.body.imagemLocal,
        observacoes: req.body.observacoes === "" ? null : req.body.observacoes,
        latitude: req.body.latitude === "" ? null : req.body.latitude,
        longitude: req.body.longitude === "" ? null : req.body.longitude,
        // Campos obrigatórios - converter string vazia para undefined para validação
        tipoLicencaId: req.body.tipoLicencaId === "" ? undefined : req.body.tipoLicencaId,
        statusId: req.body.statusId === "" ? undefined : req.body.statusId,
      };
      
      const validatedData = insertAlvaraSchema.partial().parse(processedBody);
      const alvara = await storage.updateAlvara(req.params.id, validatedData);
      
      if (!alvara) {
        return res.status(404).json({ message: "Alvará não encontrado" });
      }
      
      res.json(alvara);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar alvará" });
    }
  });

  app.delete("/api/alvaras/:id", async (req, res) => {
    try {
      const success = await storage.deleteAlvara(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Alvará não encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir alvará" });
    }
  });

  // Tipos de alvará routes
  app.get("/api/tipos", async (req, res) => {
    try {
      const tipos = await storage.getAllTiposAlvara();
      res.json(tipos);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar tipos de alvará" });
    }
  });

  app.post("/api/tipos", async (req, res) => {
    try {
      const validatedData = insertTipoAlvaraSchema.parse(req.body);
      const tipo = await storage.createTipoAlvara(validatedData);
      res.status(201).json(tipo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar tipo" });
    }
  });

  app.put("/api/tipos/:id", async (req, res) => {
    try {
      const validatedData = insertTipoAlvaraSchema.partial().parse(req.body);
      const tipo = await storage.updateTipoAlvara(req.params.id, validatedData);
      
      if (!tipo) {
        return res.status(404).json({ message: "Tipo não encontrado" });
      }
      
      res.json(tipo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar tipo" });
    }
  });

  app.delete("/api/tipos/:id", async (req, res) => {
    try {
      const success = await storage.deleteTipoAlvara(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Tipo não encontrado" });
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.message && error.message.includes("alvarás que o utilizam")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro ao excluir tipo" });
    }
  });

  // Status de alvará routes
  app.get("/api/status", async (req, res) => {
    try {
      const status = await storage.getAllStatusAlvara();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar status" });
    }
  });

  app.post("/api/status", async (req, res) => {
    try {
      const validatedData = insertStatusAlvaraSchema.parse(req.body);
      const status = await storage.createStatusAlvara(validatedData);
      res.status(201).json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar status" });
    }
  });

  app.put("/api/status/:id", async (req, res) => {
    try {
      const validatedData = insertStatusAlvaraSchema.partial().parse(req.body);
      const status = await storage.updateStatusAlvara(req.params.id, validatedData);
      
      if (!status) {
        return res.status(404).json({ message: "Status não encontrado" });
      }
      
      res.json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });

  app.delete("/api/status/:id", async (req, res) => {
    try {
      const success = await storage.deleteStatusAlvara(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Status não encontrado" });
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.message && error.message.includes("alvarás que o utilizam")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro ao excluir status" });
    }
  });

  // Export routes
  app.get("/api/export/excel", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let alvaras;
      if (startDate && endDate) {
        alvaras = await storage.filterAlvarasByDateRange(
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        alvaras = await storage.getAllAlvaras();
      }

      // In a real implementation, you would generate Excel file here
      res.json({ 
        message: "Export functionality would generate Excel file here",
        count: alvaras.length,
        data: alvaras 
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao exportar dados" });
    }
  });

  app.get("/api/export/dashboard-pdf", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await storage.getDashboardStats();
      
      // In a real implementation, you would generate PDF here
      res.json({ 
        message: "Dashboard PDF export would be generated here",
        stats,
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao exportar dashboard" });
    }
  });

  // Serve environment variables to frontend
  app.get("/api/config", (req, res) => {
    res.json({
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    });
  });

  // Rota para executar verificação manual de prazos
  app.post("/api/verificar-prazos", async (req, res) => {
    try {
      await storage.verificarEAtualizarPrazos();
      res.json({ success: true, message: "Verificação de prazos executada com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao executar verificação de prazos" });
    }
  });

  // Object storage endpoints
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/alvara-images", async (req, res) => {
    if (!req.body.imagemLocalURL) {
      return res.status(400).json({ error: "imagemLocalURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imagemLocalURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting alvara image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
