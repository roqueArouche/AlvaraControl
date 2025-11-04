import { 
  type User, 
  type InsertUser,
  type Alvara,
  type InsertAlvara,
  type AlvaraWithRelations,
  type TipoAlvara,
  type InsertTipoAlvara,
  type StatusAlvara,
  type InsertStatusAlvara,
  type DashboardStats,
  users,
  alvaras,
  tiposAlvara,
  statusAlvara
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Alvara methods
  getAllAlvaras(): Promise<AlvaraWithRelations[]>;
  getAlvaraById(id: string): Promise<AlvaraWithRelations | undefined>;
  createAlvara(alvara: InsertAlvara): Promise<Alvara>;
  updateAlvara(id: string, alvara: Partial<InsertAlvara>): Promise<Alvara | undefined>;
  deleteAlvara(id: string): Promise<boolean>;
  searchAlvaras(query: string): Promise<AlvaraWithRelations[]>;
  filterAlvarasByStatus(statusId: string): Promise<AlvaraWithRelations[]>;
  filterAlvarasByDateRange(startDate: Date, endDate: Date): Promise<AlvaraWithRelations[]>;

  // Tipo Alvara methods
  getAllTiposAlvara(): Promise<TipoAlvara[]>;
  getTipoAlvaraById(id: string): Promise<TipoAlvara | undefined>;
  createTipoAlvara(tipo: InsertTipoAlvara): Promise<TipoAlvara>;
  updateTipoAlvara(id: string, tipo: Partial<InsertTipoAlvara>): Promise<TipoAlvara | undefined>;
  deleteTipoAlvara(id: string): Promise<boolean>;

  // Status Alvara methods
  getAllStatusAlvara(): Promise<StatusAlvara[]>;
  getStatusAlvaraById(id: string): Promise<StatusAlvara | undefined>;
  createStatusAlvara(status: InsertStatusAlvara): Promise<StatusAlvara>;
  updateStatusAlvara(id: string, status: Partial<InsertStatusAlvara>): Promise<StatusAlvara | undefined>;
  deleteStatusAlvara(id: string): Promise<boolean>;

  // Dashboard methods
  getDashboardStats(): Promise<DashboardStats>;
  
  // Rotina automática de verificação de prazos
  verificarEAtualizarPrazos(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private alvaras: Map<string, Alvara>;
  private tiposAlvara: Map<string, TipoAlvara>;
  private statusAlvara: Map<string, StatusAlvara>;

  constructor() {
    this.users = new Map();
    this.alvaras = new Map();
    this.tiposAlvara = new Map();
    this.statusAlvara = new Map();
    
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default user
    await this.createUser({
      username: "valderlan",
      password: "01012025" // In real app, this would be hashed
    });

    // Create default tipos
    const tipoFuncionamento = await this.createTipoAlvara({
      nome: "Funcionamento",
      descricao: "Alvará para funcionamento de estabelecimento comercial"
    });

    const tipoComercial = await this.createTipoAlvara({
      nome: "Comercial",
      descricao: "Licença para atividades comerciais"
    });

    const tipoIndustrial = await this.createTipoAlvara({
      nome: "Industrial",
      descricao: "Licença para atividades industriais"
    });

    // Create default status
    const statusRegular = await this.createStatusAlvara({
      nome: "Regular",
      cor: "#10b981",
      descricao: "Alvará em situação regular"
    });

    const statusInapto = await this.createStatusAlvara({
      nome: "Inapto",
      cor: "#ef4444",
      descricao: "Alvará com prazo vencido"
    });

    const statusNotificado = await this.createStatusAlvara({
      nome: "Notificado",
      cor: "#eab308",
      descricao: "Contribuinte foi notificado"
    });

    const statusAnalise = await this.createStatusAlvara({
      nome: "Em Análise",
      cor: "#3b82f6",
      descricao: "Documentação em análise"
    });

    const statusSuspenso = await this.createStatusAlvara({
      nome: "Suspenso",
      cor: "#6b7280",
      descricao: "Atividades suspensas"
    });

    // Criar status específicos para o sistema de prazos
    await this.createStatusAlvara({
      nome: "1º Prazo Vencido",
      cor: "#f97316",
      descricao: "Primeiro prazo de comparecimento vencido"
    });

    await this.createStatusAlvara({
      nome: "Em Processo de Regularização",
      cor: "#0ea5e9",
      descricao: "Contribuinte compareceu e está em processo de regularização"
    });

    await this.createStatusAlvara({
      nome: "2º Prazo Vencido",
      cor: "#dc2626",
      descricao: "Segundo prazo de regularização vencido"
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
    };
    this.users.set(id, user);
    return user;
  }

  // Alvara methods
  async getAllAlvaras(): Promise<AlvaraWithRelations[]> {
    const alvaras = Array.from(this.alvaras.values());
    return this.enrichAlvarasWithRelations(alvaras);
  }

  async getAlvaraById(id: string): Promise<AlvaraWithRelations | undefined> {
    const alvara = this.alvaras.get(id);
    if (!alvara) return undefined;
    
    const enriched = await this.enrichAlvarasWithRelations([alvara]);
    return enriched[0];
  }

  async createAlvara(insertAlvara: InsertAlvara): Promise<Alvara> {
    const id = randomUUID();
    const now = new Date();
    
    const alvara: Alvara = {
      ...insertAlvara,
      id,
      latitude: insertAlvara.latitude || null,
      longitude: insertAlvara.longitude || null,
      imagemLocal: insertAlvara.imagemLocal || null,
      observacoes: insertAlvara.observacoes || null,
      tipoLicencaId: insertAlvara.tipoLicencaId || null,
      statusId: insertAlvara.statusId || null,
      dataNotificacao: insertAlvara.dataNotificacao ? new Date(insertAlvara.dataNotificacao) : null,
      dataVisita: insertAlvara.dataVisita ? new Date(insertAlvara.dataVisita) : null,
      prazoRegularizacao: null, // Deprecated field
      primeiroPrazo: insertAlvara.primeiroPrazo ? new Date(insertAlvara.primeiroPrazo) : null,
      segundoPrazo: insertAlvara.segundoPrazo ? new Date(insertAlvara.segundoPrazo) : null,
      createdAt: now,
      updatedAt: now,
    };

    // Auto-calculate status based on deadline (using effectiveSegundoPrazo)
    const effectiveSegundoPrazo = alvara.segundoPrazo || alvara.prazoRegularizacao;
    if (effectiveSegundoPrazo && new Date() > effectiveSegundoPrazo) {
      const inaptoStatus = Array.from(this.statusAlvara.values()).find(s => s.nome === "Inapto");
      if (inaptoStatus) {
        alvara.statusId = inaptoStatus.id;
      }
    }

    this.alvaras.set(id, alvara);
    return alvara;
  }

  async updateAlvara(id: string, updateAlvara: Partial<InsertAlvara>): Promise<Alvara | undefined> {
    const existing = this.alvaras.get(id);
    if (!existing) return undefined;

    const updated: Alvara = {
      ...existing,
      ...updateAlvara,
      dataNotificacao: updateAlvara.dataNotificacao !== undefined 
        ? (updateAlvara.dataNotificacao && updateAlvara.dataNotificacao.trim() !== "" ? new Date(updateAlvara.dataNotificacao) : null)
        : existing.dataNotificacao,
      dataVisita: updateAlvara.dataVisita !== undefined
        ? (updateAlvara.dataVisita && updateAlvara.dataVisita.trim() !== "" ? new Date(updateAlvara.dataVisita) : null)
        : existing.dataVisita,
      prazoRegularizacao: existing.prazoRegularizacao, // Keep existing deprecated value
      primeiroPrazo: updateAlvara.primeiroPrazo !== undefined
        ? (updateAlvara.primeiroPrazo && updateAlvara.primeiroPrazo.trim() !== "" ? new Date(updateAlvara.primeiroPrazo) : null)
        : existing.primeiroPrazo,
      segundoPrazo: updateAlvara.segundoPrazo !== undefined
        ? (updateAlvara.segundoPrazo && updateAlvara.segundoPrazo.trim() !== "" ? new Date(updateAlvara.segundoPrazo) : null)
        : existing.segundoPrazo,
      updatedAt: new Date(),
    };

    this.alvaras.set(id, updated);
    return updated;
  }

  async deleteAlvara(id: string): Promise<boolean> {
    return this.alvaras.delete(id);
  }

  async searchAlvaras(query: string): Promise<AlvaraWithRelations[]> {
    const lowercaseQuery = query.toLowerCase();
    const filtered = Array.from(this.alvaras.values()).filter(alvara =>
      alvara.nomeContribuinte.toLowerCase().includes(lowercaseQuery) ||
      alvara.cpf.includes(query) ||
      alvara.endereco.toLowerCase().includes(lowercaseQuery)
    );
    
    return this.enrichAlvarasWithRelations(filtered);
  }

  async filterAlvarasByStatus(statusId: string): Promise<AlvaraWithRelations[]> {
    const filtered = Array.from(this.alvaras.values()).filter(alvara =>
      alvara.statusId === statusId
    );
    
    return this.enrichAlvarasWithRelations(filtered);
  }

  async filterAlvarasByDateRange(startDate: Date, endDate: Date): Promise<AlvaraWithRelations[]> {
    const filtered = Array.from(this.alvaras.values()).filter(alvara =>
      alvara.createdAt && alvara.createdAt >= startDate && alvara.createdAt <= endDate
    );
    
    return this.enrichAlvarasWithRelations(filtered);
  }

  // Tipo Alvara methods
  async getAllTiposAlvara(): Promise<TipoAlvara[]> {
    return Array.from(this.tiposAlvara.values());
  }

  async getTipoAlvaraById(id: string): Promise<TipoAlvara | undefined> {
    return this.tiposAlvara.get(id);
  }

  async createTipoAlvara(insertTipo: InsertTipoAlvara): Promise<TipoAlvara> {
    const id = randomUUID();
    const tipo: TipoAlvara = {
      ...insertTipo,
      id,
      descricao: insertTipo.descricao || null,
      createdAt: new Date(),
    };
    this.tiposAlvara.set(id, tipo);
    return tipo;
  }

  async updateTipoAlvara(id: string, updateTipo: Partial<InsertTipoAlvara>): Promise<TipoAlvara | undefined> {
    const existing = this.tiposAlvara.get(id);
    if (!existing) return undefined;

    const updated: TipoAlvara = {
      ...existing,
      ...updateTipo,
    };

    this.tiposAlvara.set(id, updated);
    return updated;
  }

  async deleteTipoAlvara(id: string): Promise<boolean> {
    return this.tiposAlvara.delete(id);
  }

  // Status Alvara methods
  async getAllStatusAlvara(): Promise<StatusAlvara[]> {
    return Array.from(this.statusAlvara.values());
  }

  async getStatusAlvaraById(id: string): Promise<StatusAlvara | undefined> {
    return this.statusAlvara.get(id);
  }

  async createStatusAlvara(insertStatus: InsertStatusAlvara): Promise<StatusAlvara> {
    const id = randomUUID();
    const status: StatusAlvara = {
      ...insertStatus,
      id,
      descricao: insertStatus.descricao || null,
      createdAt: new Date(),
    };
    this.statusAlvara.set(id, status);
    return status;
  }

  async updateStatusAlvara(id: string, updateStatus: Partial<InsertStatusAlvara>): Promise<StatusAlvara | undefined> {
    const existing = this.statusAlvara.get(id);
    if (!existing) return undefined;

    const updated: StatusAlvara = {
      ...existing,
      ...updateStatus,
    };

    this.statusAlvara.set(id, updated);
    return updated;
  }

  async deleteStatusAlvara(id: string): Promise<boolean> {
    return this.statusAlvara.delete(id);
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    const alvaras = Array.from(this.alvaras.values());
    const statusList = Array.from(this.statusAlvara.values());
    
    const regularStatus = statusList.find(s => s.nome === "Regular");
    const inaptoStatus = statusList.find(s => s.nome === "Inapto");
    const notificadoStatus = statusList.find(s => s.nome === "Notificado");
    
    const now = new Date();
    
    const regulares = alvaras.filter(a => a.statusId === regularStatus?.id).length;
    const semRegularizacao = alvaras.filter(a => a.statusId === inaptoStatus?.id).length;
    const notificados = alvaras.filter(a => a.statusId === notificadoStatus?.id).length;
    const prazoVencido = alvaras.filter(a => {
      const effectiveSegundoPrazo = a.segundoPrazo || a.prazoRegularizacao;
      return effectiveSegundoPrazo && effectiveSegundoPrazo < now;
    }).length;

    return {
      semRegularizacao,
      notificados,
      prazoVencido,
      regulares,
      total: alvaras.length,
    };
  }

  // Rotina automática de verificação de prazos
  async verificarEAtualizarPrazos(): Promise<void> {
    const now = new Date();
    const alvaras = Array.from(this.alvaras.values());
    const statusList = Array.from(this.statusAlvara.values());
    
    // Buscar status necessários
    const statusNotificado = statusList.find(s => s.nome === "Notificado");
    const status1PrazoVencido = statusList.find(s => s.nome === "1º Prazo Vencido");
    const statusEmProcesso = statusList.find(s => s.nome === "Em Processo de Regularização");
    const status2PrazoVencido = statusList.find(s => s.nome === "2º Prazo Vencido");
    const statusInapto = statusList.find(s => s.nome === "Inapto");
    
    for (const alvara of alvaras) {
      let needsUpdate = false;
      const updatedAlvara = { ...alvara };
      let newStatusId = alvara.statusId;
      
      // Lógica orientada por dados: avalia prazos e define status apropriado
      
      // 1. Se tem dataVisita e effectiveSegundoPrazo, verifica regras do segundo prazo
      const effectiveSegundoPrazo = alvara.segundoPrazo || alvara.prazoRegularizacao;
      if (alvara.dataVisita && effectiveSegundoPrazo) {
        if (now > effectiveSegundoPrazo) {
          // Segundo prazo vencido
          if (alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = status2PrazoVencido?.id || null;
            needsUpdate = true;
          }
        } else {
          // Ainda dentro do segundo prazo, deve estar "Em Processo de Regularização"
          if (alvara.statusId !== statusEmProcesso?.id && 
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = statusEmProcesso?.id || null;
            needsUpdate = true;
          }
        }
      }
      // 2. Se tem dataNotificacao e primeiroPrazo, verifica regras do primeiro prazo
      else if (alvara.dataNotificacao && alvara.primeiroPrazo) {
        if (now > alvara.primeiroPrazo) {
          // Primeiro prazo vencido
          if (alvara.statusId !== status1PrazoVencido?.id &&
              alvara.statusId !== statusEmProcesso?.id &&
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = status1PrazoVencido?.id || null;
            needsUpdate = true;
          }
        } else {
          // Ainda dentro do primeiro prazo, deve estar "Notificado"
          if (alvara.statusId !== statusNotificado?.id && 
              alvara.statusId !== status1PrazoVencido?.id &&
              alvara.statusId !== statusEmProcesso?.id &&
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = statusNotificado?.id || null;
            needsUpdate = true;
          }
        }
      }
      // 3. Fallback: se effectiveSegundoPrazo vencido e nenhuma das regras acima se aplica
      else {
        const effectiveSegundoPrazo = alvara.segundoPrazo || alvara.prazoRegularizacao;
        if (effectiveSegundoPrazo && now > effectiveSegundoPrazo) {
          if (alvara.statusId !== statusInapto?.id &&
              alvara.statusId !== status1PrazoVencido?.id &&
              alvara.statusId !== statusEmProcesso?.id &&
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = statusInapto?.id || null;
            needsUpdate = true;
          }
        }
      }
      
      if (needsUpdate) {
        updatedAlvara.statusId = newStatusId;
        updatedAlvara.updatedAt = now;
        this.alvaras.set(alvara.id, updatedAlvara);
      }
    }
  }

  private async enrichAlvarasWithRelations(alvaras: Alvara[]): Promise<AlvaraWithRelations[]> {
    return alvaras.map(alvara => ({
      ...alvara,
      tipoLicenca: alvara.tipoLicencaId ? this.tiposAlvara.get(alvara.tipoLicencaId) : undefined,
      status: alvara.statusId ? this.statusAlvara.get(alvara.statusId) : undefined,
    }));
  }
}

export class PostgresStorage implements IStorage {
  // Validação de imagemLocal antes de salvar
  private validateImagemLocal(imagemLocal: string | null | undefined): void {
    if (!imagemLocal || imagemLocal.trim() === '') return; // OK - campo opcional

    const MAX_IMAGES = 3;
    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    try {
      const parsed = JSON.parse(imagemLocal);
      
      // Deve ser array
      if (!Array.isArray(parsed)) {
        throw new Error('imagemLocal deve ser um array JSON de strings');
      }

      // Máximo 3 imagens
      if (parsed.length > MAX_IMAGES) {
        throw new Error(`Máximo de ${MAX_IMAGES} imagens permitido`);
      }

      // Validar cada imagem
      for (let i = 0; i < parsed.length; i++) {
        const img = parsed[i];
        
        if (typeof img !== 'string') {
          throw new Error(`Imagem ${i + 1} deve ser uma string`);
        }

        // Se é Data URL, validar tamanho
        if (img.startsWith('data:')) {
          // Estimar tamanho do base64 (3/4 do tamanho após o "data:image/...;base64,")
          const base64Part = img.split(',')[1];
          if (base64Part) {
            const estimatedSize = (base64Part.length * 3) / 4;
            if (estimatedSize > MAX_SIZE_BYTES) {
              throw new Error(`Imagem ${i + 1} excede o limite de ${MAX_SIZE_MB}MB`);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('imagemLocal deve ser um array JSON válido');
      }
      throw error;
    }
  }

  // Helper seguro para parse de imagemLocal (pode ter dados legacy inválidos)
  private safeParseImagemLocal(imagemLocal: any, alvaraId: string): string | null {
    // Se já é null, retorna null
    if (imagemLocal === null || imagemLocal === undefined) {
      return null;
    }
    
    // Se é string vazia, retorna null
    if (typeof imagemLocal === 'string' && imagemLocal.trim() === '') {
      console.warn(`[STORAGE] Alvará ${alvaraId}: imagemLocal vazio, retornando null`);
      return null;
    }
    
    // Se é string, pode ser:
    // 1. Data URL (data:image/...)
    // 2. JSON array de strings
    // 3. Path simples
    if (typeof imagemLocal === 'string') {
      // Se começa com data:, é uma Data URL válida - manter como está
      if (imagemLocal.startsWith('data:')) {
        return imagemLocal;
      }
      
      // Tenta fazer parse como JSON
      try {
        const parsed = JSON.parse(imagemLocal);
        // Se deu certo, retorna a string original (o banco espera string JSON)
        return imagemLocal;
      } catch (error) {
        // Se falhou o parse, pode ser um path simples ou string inválida
        // Se parece com path (/objects/...), aceitar
        if (imagemLocal.startsWith('/') || imagemLocal.startsWith('http')) {
          return imagemLocal;
        }
        console.warn(`[STORAGE] Alvará ${alvaraId}: imagemLocal inválido "${imagemLocal.substring(0, 50)}...", retornando null`);
        return null;
      }
    }
    
    // Se já é um objeto/array, converte para string JSON
    if (typeof imagemLocal === 'object') {
      return JSON.stringify(imagemLocal);
    }
    
    // Qualquer outro tipo, retorna null
    console.warn(`[STORAGE] Alvará ${alvaraId}: imagemLocal tipo inesperado (${typeof imagemLocal}), retornando null`);
    return null;
  }

  // Função auxiliar para normalizar imagemLocal para array JSON
  private normalizeImagemLocal(imagemLocal: any, alvaraId: string): string | null {
    try {
      const parsed = this.safeParseImagemLocal(imagemLocal, alvaraId);
      if (!parsed) return null;

      // Se já é um JSON array, retorna como está
      try {
        const data = JSON.parse(parsed);
        if (Array.isArray(data)) {
          return parsed; // Já é array JSON
        }
        // Se é string simples dentro de JSON, converte para array
        if (typeof data === 'string') {
          return JSON.stringify([data]);
        }
      } catch {
        // Se não é JSON, é uma string simples - converter para array
        return JSON.stringify([parsed]);
      }

      return parsed;
    } catch (error) {
      console.error(`[STORAGE ERROR] Erro crítico ao normalizar imagemLocal para alvará ${alvaraId}:`, error);
      return null; // Retorna null em caso de erro crítico
    }
  }

  // Função auxiliar para transformar resultados do DB em AlvaraWithRelations
  private mapDbResultToAlvara(dbResult: any): AlvaraWithRelations {
    try {
      // Processar imagemLocal com proteção extra
      let imagemLocal: string | null = null;
      try {
        imagemLocal = this.normalizeImagemLocal(dbResult.imagemLocal, dbResult.id);
      } catch (imgError) {
        console.error(`[STORAGE ERROR] Falha ao processar imagem do alvará ${dbResult.id}:`, imgError);
        imagemLocal = null; // Continue sem a imagem em caso de erro
      }

      return {
        id: dbResult.id,
        nomeContribuinte: dbResult.nomeContribuinte,
        cpf: dbResult.cpf,
        endereco: dbResult.endereco,
        bairro: dbResult.bairro,
        latitude: dbResult.latitude,
        longitude: dbResult.longitude,
        imagemLocal,
        observacoes: dbResult.observacoes,
        dataNotificacao: dbResult.dataNotificacao,
        dataVisita: dbResult.dataVisita,
        prazoRegularizacao: dbResult.prazoRegularizacao,
        primeiroPrazo: dbResult.primeiroPrazo,
        segundoPrazo: dbResult.segundoPrazo,
        tipoLicencaId: dbResult.tipoLicencaId,
        statusId: dbResult.statusId,
        createdAt: dbResult.createdAt,
        updatedAt: dbResult.updatedAt,
        tipoLicenca: dbResult.tipoLicenca || undefined,
        status: dbResult.status || undefined,
      };
    } catch (error) {
      console.error(`[STORAGE ERROR] Erro crítico ao mapear alvará ${dbResult.id}:`, error);
      // Em caso de erro catastrófico, retornar objeto mínimo válido
      return {
        id: dbResult.id || 'unknown',
        nomeContribuinte: dbResult.nomeContribuinte || 'Erro ao carregar',
        cpf: dbResult.cpf || '',
        endereco: dbResult.endereco || '',
        bairro: dbResult.bairro || '',
        latitude: null,
        longitude: null,
        imagemLocal: null,
        observacoes: '',
        dataNotificacao: null,
        dataVisita: null,
        prazoRegularizacao: null,
        primeiroPrazo: null,
        segundoPrazo: null,
        tipoLicencaId: dbResult.tipoLicencaId || '',
        statusId: dbResult.statusId || '',
        createdAt: dbResult.createdAt || new Date(),
        updatedAt: dbResult.updatedAt || new Date(),
      };
    }
  }
  async initializeDefaultData() {
    // Check if user already exists
    const existingUser = await this.getUserByUsername("valderlan");
    if (!existingUser) {
      await this.createUser({
        username: "valderlan",
        password: "01012025"
      });
    }

    // Check if default tipos exist
    const existingTipos = await this.getAllTiposAlvara();
    if (existingTipos.length === 0) {
      await this.createTipoAlvara({
        nome: "Funcionamento",
        descricao: "Alvará para funcionamento de estabelecimento comercial"
      });
      await this.createTipoAlvara({
        nome: "Comercial", 
        descricao: "Licença para atividades comerciais"
      });
      await this.createTipoAlvara({
        nome: "Industrial",
        descricao: "Licença para atividades industriais"
      });
    }

    // Check if default status exist
    const existingStatus = await this.getAllStatusAlvara();
    if (existingStatus.length === 0) {
      await this.createStatusAlvara({
        nome: "Regular",
        cor: "#10b981",
        descricao: "Alvará em situação regular"
      });
      await this.createStatusAlvara({
        nome: "Inapto", 
        cor: "#ef4444",
        descricao: "Alvará com prazo vencido"
      });
      await this.createStatusAlvara({
        nome: "Notificado",
        cor: "#eab308", 
        descricao: "Contribuinte foi notificado"
      });
      await this.createStatusAlvara({
        nome: "Em Análise",
        cor: "#3b82f6",
        descricao: "Documentação em análise"
      });
      await this.createStatusAlvara({
        nome: "Suspenso",
        cor: "#6b7280",
        descricao: "Atividades suspensas"
      });
    }
    
    // Criar status específicos para o sistema de prazos se não existirem
    await this.createStatusesForPrazos();
  }

  private async createStatusesForPrazos(): Promise<void> {
    const existingStatus = await this.getAllStatusAlvara();
    const statusNames = existingStatus.map(s => s.nome);
    
    // Criar status necessários para o sistema de prazos
    const requiredStatus = [
      {
        nome: "1º Prazo Vencido",
        cor: "#f97316",
        descricao: "Primeiro prazo de comparecimento vencido"
      },
      {
        nome: "Em Processo de Regularização",
        cor: "#0ea5e9",
        descricao: "Contribuinte compareceu e está em processo de regularização"
      },
      {
        nome: "2º Prazo Vencido",
        cor: "#dc2626",
        descricao: "Segundo prazo de regularização vencido"
      }
    ];
    
    for (const status of requiredStatus) {
      if (!statusNames.includes(status.nome)) {
        await this.createStatusAlvara(status);
      }
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Alvara methods
  async getAllAlvaras(): Promise<AlvaraWithRelations[]> {
    try {
      console.log('[STORAGE] getAllAlvaras - Iniciando query do banco');
      
      const result = await db.select({
        id: alvaras.id,
        nomeContribuinte: alvaras.nomeContribuinte,
        cpf: alvaras.cpf,
        endereco: alvaras.endereco,
        bairro: alvaras.bairro,
        latitude: alvaras.latitude,
        longitude: alvaras.longitude,
        imagemLocal: alvaras.imagemLocal,
        observacoes: alvaras.observacoes,
        dataNotificacao: alvaras.dataNotificacao,
        dataVisita: alvaras.dataVisita,
        prazoRegularizacao: alvaras.prazoRegularizacao,
        primeiroPrazo: alvaras.primeiroPrazo,
        segundoPrazo: alvaras.segundoPrazo,
        tipoLicencaId: alvaras.tipoLicencaId,
        statusId: alvaras.statusId,
        createdAt: alvaras.createdAt,
        updatedAt: alvaras.updatedAt,
        tipoLicenca: tiposAlvara,
        status: statusAlvara
      })
      .from(alvaras)
      .leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id))
      .leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id));
      
      console.log('[STORAGE] getAllAlvaras - Query retornou', result.length, 'registros');
      console.log('[STORAGE] getAllAlvaras - Mapeando resultados...');
      
      // Mapear com proteção contra erros individuais
      const mapped: AlvaraWithRelations[] = [];
      for (const r of result) {
        try {
          const alvara = this.mapDbResultToAlvara(r);
          mapped.push(alvara);
        } catch (mapError) {
          console.error(`[STORAGE ERROR] Erro ao mapear registro ${r.id}, pulando:`, mapError);
          // Continua com os outros registros mesmo se um falhar
        }
      }
      
      console.log('[STORAGE] getAllAlvaras - Mapeamento concluído:', mapped.length, 'de', result.length, 'registros');
      
      return mapped;
    } catch (error) {
      console.error('[STORAGE ERROR] Erro em getAllAlvaras:', error);
      console.error('[STORAGE ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async getAlvaraById(id: string): Promise<AlvaraWithRelations | undefined> {
    const result = await db.select({
      id: alvaras.id,
      nomeContribuinte: alvaras.nomeContribuinte,
      cpf: alvaras.cpf,
      endereco: alvaras.endereco,
      bairro: alvaras.bairro,
      latitude: alvaras.latitude,
      longitude: alvaras.longitude,
      imagemLocal: alvaras.imagemLocal,
      observacoes: alvaras.observacoes,
      dataNotificacao: alvaras.dataNotificacao,
      dataVisita: alvaras.dataVisita,
      prazoRegularizacao: alvaras.prazoRegularizacao,
      primeiroPrazo: alvaras.primeiroPrazo,
      segundoPrazo: alvaras.segundoPrazo,
      tipoLicencaId: alvaras.tipoLicencaId,
      statusId: alvaras.statusId,
      createdAt: alvaras.createdAt,
      updatedAt: alvaras.updatedAt,
      tipoLicenca: tiposAlvara,
      status: statusAlvara
    })
    .from(alvaras)
    .leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id))
    .leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id))
    .where(eq(alvaras.id, id));
    
    return result[0] ? this.mapDbResultToAlvara(result[0]) : undefined;
  }

  async createAlvara(insertAlvara: InsertAlvara): Promise<Alvara> {
    // Validar imagemLocal antes de salvar
    this.validateImagemLocal(insertAlvara.imagemLocal || null);

    const dataToInsert = {
      ...insertAlvara,
      dataNotificacao: insertAlvara.dataNotificacao ? new Date(insertAlvara.dataNotificacao) : null,
      dataVisita: insertAlvara.dataVisita ? new Date(insertAlvara.dataVisita) : null,
      prazoRegularizacao: null, // Deprecated field
      primeiroPrazo: insertAlvara.primeiroPrazo ? new Date(insertAlvara.primeiroPrazo) : null,
      segundoPrazo: insertAlvara.segundoPrazo ? new Date(insertAlvara.segundoPrazo) : null
    };

    const result = await db.insert(alvaras).values(dataToInsert).returning();
    return result[0];
  }

  async updateAlvara(id: string, updateAlvara: Partial<InsertAlvara>): Promise<Alvara | undefined> {
    // Validar imagemLocal antes de atualizar
    if (updateAlvara.imagemLocal !== undefined) {
      this.validateImagemLocal(updateAlvara.imagemLocal || null);
    }

    const dataToUpdate = {
      ...updateAlvara,
      dataNotificacao: updateAlvara.dataNotificacao !== undefined 
        ? (updateAlvara.dataNotificacao && updateAlvara.dataNotificacao.trim() !== "" ? new Date(updateAlvara.dataNotificacao) : null)
        : undefined,
      dataVisita: updateAlvara.dataVisita !== undefined
        ? (updateAlvara.dataVisita && updateAlvara.dataVisita.trim() !== "" ? new Date(updateAlvara.dataVisita) : null)
        : undefined,
      // prazoRegularizacao is deprecated - no longer in insert schema
      primeiroPrazo: updateAlvara.primeiroPrazo !== undefined
        ? (updateAlvara.primeiroPrazo && updateAlvara.primeiroPrazo.trim() !== "" ? new Date(updateAlvara.primeiroPrazo) : null)
        : undefined,
      segundoPrazo: updateAlvara.segundoPrazo !== undefined
        ? (updateAlvara.segundoPrazo && updateAlvara.segundoPrazo.trim() !== "" ? new Date(updateAlvara.segundoPrazo) : null)
        : undefined,
      updatedAt: new Date()
    };

    const result = await db.update(alvaras).set(dataToUpdate).where(eq(alvaras.id, id)).returning();
    return result[0];
  }

  async deleteAlvara(id: string): Promise<boolean> {
    const result = await db.delete(alvaras).where(eq(alvaras.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchAlvaras(query: string): Promise<AlvaraWithRelations[]> {
    const result = await db.select({
      id: alvaras.id,
      nomeContribuinte: alvaras.nomeContribuinte,
      cpf: alvaras.cpf,
      endereco: alvaras.endereco,
      bairro: alvaras.bairro,
      latitude: alvaras.latitude,
      longitude: alvaras.longitude,
      imagemLocal: alvaras.imagemLocal,
      observacoes: alvaras.observacoes,
      dataNotificacao: alvaras.dataNotificacao,
      dataVisita: alvaras.dataVisita,
      prazoRegularizacao: alvaras.prazoRegularizacao,
      primeiroPrazo: alvaras.primeiroPrazo,
      segundoPrazo: alvaras.segundoPrazo,
      tipoLicencaId: alvaras.tipoLicencaId,
      statusId: alvaras.statusId,
      createdAt: alvaras.createdAt,
      updatedAt: alvaras.updatedAt,
      tipoLicenca: tiposAlvara,
      status: statusAlvara
    })
    .from(alvaras)
    .leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id))
    .leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id))
    .where(or(
      ilike(alvaras.nomeContribuinte, `%${query}%`),
      ilike(alvaras.cpf, `%${query}%`),
      ilike(alvaras.endereco, `%${query}%`)
    ));
    
    return result.map(r => this.mapDbResultToAlvara(r));
  }

  async filterAlvarasByStatus(statusId: string): Promise<AlvaraWithRelations[]> {
    const result = await db.select({
      id: alvaras.id,
      nomeContribuinte: alvaras.nomeContribuinte,
      cpf: alvaras.cpf,
      endereco: alvaras.endereco,
      bairro: alvaras.bairro,
      latitude: alvaras.latitude,
      longitude: alvaras.longitude,
      imagemLocal: alvaras.imagemLocal,
      observacoes: alvaras.observacoes,
      dataNotificacao: alvaras.dataNotificacao,
      dataVisita: alvaras.dataVisita,
      prazoRegularizacao: alvaras.prazoRegularizacao,
      primeiroPrazo: alvaras.primeiroPrazo,
      segundoPrazo: alvaras.segundoPrazo,
      tipoLicencaId: alvaras.tipoLicencaId,
      statusId: alvaras.statusId,
      createdAt: alvaras.createdAt,
      updatedAt: alvaras.updatedAt,
      tipoLicenca: tiposAlvara,
      status: statusAlvara
    })
    .from(alvaras)
    .leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id))
    .leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id))
    .where(eq(alvaras.statusId, statusId));
    
    return result.map(r => this.mapDbResultToAlvara(r));
  }

  async filterAlvarasByDateRange(startDate: Date, endDate: Date): Promise<AlvaraWithRelations[]> {
    const result = await db.select({
      id: alvaras.id,
      nomeContribuinte: alvaras.nomeContribuinte,
      cpf: alvaras.cpf,
      endereco: alvaras.endereco,
      bairro: alvaras.bairro,
      latitude: alvaras.latitude,
      longitude: alvaras.longitude,
      imagemLocal: alvaras.imagemLocal,
      observacoes: alvaras.observacoes,
      dataNotificacao: alvaras.dataNotificacao,
      dataVisita: alvaras.dataVisita,
      prazoRegularizacao: alvaras.prazoRegularizacao,
      primeiroPrazo: alvaras.primeiroPrazo,
      segundoPrazo: alvaras.segundoPrazo,
      tipoLicencaId: alvaras.tipoLicencaId,
      statusId: alvaras.statusId,
      createdAt: alvaras.createdAt,
      updatedAt: alvaras.updatedAt,
      tipoLicenca: tiposAlvara,
      status: statusAlvara
    })
    .from(alvaras)
    .leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id))
    .leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id))
    .where(and(
      gte(alvaras.createdAt, startDate),
      lte(alvaras.createdAt, endDate)
    ));
    
    return result.map(r => this.mapDbResultToAlvara(r));
  }

  // Tipo Alvara methods
  async getAllTiposAlvara(): Promise<TipoAlvara[]> {
    return await db.select().from(tiposAlvara);
  }

  async getTipoAlvaraById(id: string): Promise<TipoAlvara | undefined> {
    const result = await db.select().from(tiposAlvara).where(eq(tiposAlvara.id, id));
    return result[0];
  }

  async createTipoAlvara(tipo: InsertTipoAlvara): Promise<TipoAlvara> {
    const result = await db.insert(tiposAlvara).values(tipo).returning();
    return result[0];
  }

  async updateTipoAlvara(id: string, tipo: Partial<InsertTipoAlvara>): Promise<TipoAlvara | undefined> {
    const result = await db.update(tiposAlvara).set(tipo).where(eq(tiposAlvara.id, id)).returning();
    return result[0];
  }

  async deleteTipoAlvara(id: string): Promise<boolean> {
    try {
      // Verificar se há alvarás usando este tipo
      const alvarasUsingTipo = await db.select().from(alvaras).where(eq(alvaras.tipoLicencaId, id)).limit(1);
      if (alvarasUsingTipo.length > 0) {
        throw new Error("Não é possível excluir este tipo pois existem alvarás que o utilizam");
      }

      const result = await db.delete(tiposAlvara).where(eq(tiposAlvara.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error: any) {
      if (error.message.includes("alvarás que o utilizam")) {
        throw error;
      }
      // Erro de violação de FK ou outro erro de banco
      throw new Error("Não é possível excluir este tipo pois existem alvarás que o utilizam");
    }
  }

  // Status Alvara methods
  async getAllStatusAlvara(): Promise<StatusAlvara[]> {
    return await db.select().from(statusAlvara);
  }

  async getStatusAlvaraById(id: string): Promise<StatusAlvara | undefined> {
    const result = await db.select().from(statusAlvara).where(eq(statusAlvara.id, id));
    return result[0];
  }

  async createStatusAlvara(status: InsertStatusAlvara): Promise<StatusAlvara> {
    const result = await db.insert(statusAlvara).values(status).returning();
    return result[0];
  }

  async updateStatusAlvara(id: string, status: Partial<InsertStatusAlvara>): Promise<StatusAlvara | undefined> {
    const result = await db.update(statusAlvara).set(status).where(eq(statusAlvara.id, id)).returning();
    return result[0];
  }

  async deleteStatusAlvara(id: string): Promise<boolean> {
    try {
      // Verificar se há alvarás usando este status
      const alvarasUsingStatus = await db.select().from(alvaras).where(eq(alvaras.statusId, id)).limit(1);
      if (alvarasUsingStatus.length > 0) {
        throw new Error("Não é possível excluir este status pois existem alvarás que o utilizam");
      }

      const result = await db.delete(statusAlvara).where(eq(statusAlvara.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error: any) {
      if (error.message.includes("alvarás que o utilizam")) {
        throw error;
      }
      // Erro de violação de FK ou outro erro de banco
      throw new Error("Não é possível excluir este status pois existem alvarás que o utilizam");
    }
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    const alvarasList = await db.select().from(alvaras);
    const statusList = await db.select().from(statusAlvara);
    
    const regularStatus = statusList.find(s => s.nome === "Regular");
    const inaptoStatus = statusList.find(s => s.nome === "Inapto");
    const notificadoStatus = statusList.find(s => s.nome === "Notificado");
    
    const now = new Date();
    
    const regulares = alvarasList.filter(a => a.statusId === regularStatus?.id).length;
    const semRegularizacao = alvarasList.filter(a => a.statusId === inaptoStatus?.id).length;
    const notificados = alvarasList.filter(a => a.statusId === notificadoStatus?.id).length;
    const prazoVencido = alvarasList.filter(a => {
      const effectiveSegundoPrazo = a.segundoPrazo || a.prazoRegularizacao;
      return effectiveSegundoPrazo && effectiveSegundoPrazo < now;
    }).length;

    return {
      semRegularizacao,
      notificados,
      prazoVencido,
      regulares,
      total: alvarasList.length,
    };
  }

  // Rotina automática de verificação de prazos
  async verificarEAtualizarPrazos(): Promise<void> {
    try {
      console.log('[STORAGE] verificarEAtualizarPrazos - Iniciando');
      const now = new Date();
      
      // Buscar todos os status necessários
      console.log('[STORAGE] Buscando status...');
      const statusList = await this.getAllStatusAlvara();
      console.log('[STORAGE] Status encontrados:', statusList.length);
      
      const statusNotificado = statusList.find(s => s.nome === "Notificado");
      const status1PrazoVencido = statusList.find(s => s.nome === "1º Prazo Vencido");
      const statusEmProcesso = statusList.find(s => s.nome === "Em Processo de Regularização");
      const status2PrazoVencido = statusList.find(s => s.nome === "2º Prazo Vencido");
      const statusInapto = statusList.find(s => s.nome === "Inapto");
      
      console.log('[STORAGE] Status necessários encontrados:', {
        notificado: !!statusNotificado,
        prazo1Vencido: !!status1PrazoVencido,
        emProcesso: !!statusEmProcesso,
        prazo2Vencido: !!status2PrazoVencido,
        inapto: !!statusInapto
      });
      
      // Buscar todos os alvarás para verificação
      console.log('[STORAGE] Buscando alvarás do banco...');
      const alvarasList = await db.select().from(alvaras);
      console.log('[STORAGE] Alvarás encontrados:', alvarasList.length);
    
    for (const alvara of alvarasList) {
      let newStatusId = alvara.statusId;
      let needsUpdate = false;
      
      // Lógica orientada por dados: avalia prazos e define status apropriado
      
      // 1. Se tem dataVisita e effectiveSegundoPrazo, verifica regras do segundo prazo
      const effectiveSegundoPrazo = alvara.segundoPrazo || alvara.prazoRegularizacao;
      if (alvara.dataVisita && effectiveSegundoPrazo) {
        if (now > effectiveSegundoPrazo) {
          // Segundo prazo vencido
          if (alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = status2PrazoVencido?.id || null;
            needsUpdate = true;
          }
        } else {
          // Ainda dentro do segundo prazo, deve estar "Em Processo de Regularização"
          if (alvara.statusId !== statusEmProcesso?.id && 
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = statusEmProcesso?.id || null;
            needsUpdate = true;
          }
        }
      }
      // 2. Se tem dataNotificacao e primeiroPrazo, verifica regras do primeiro prazo
      else if (alvara.dataNotificacao && alvara.primeiroPrazo) {
        if (now > alvara.primeiroPrazo) {
          // Primeiro prazo vencido
          if (alvara.statusId !== status1PrazoVencido?.id &&
              alvara.statusId !== statusEmProcesso?.id &&
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = status1PrazoVencido?.id || null;
            needsUpdate = true;
          }
        } else {
          // Ainda dentro do primeiro prazo, deve estar "Notificado"
          if (alvara.statusId !== statusNotificado?.id && 
              alvara.statusId !== status1PrazoVencido?.id &&
              alvara.statusId !== statusEmProcesso?.id &&
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = statusNotificado?.id || null;
            needsUpdate = true;
          }
        }
      }
      // 3. Fallback: se effectiveSegundoPrazo vencido e nenhuma das regras acima se aplica
      else {
        const effectiveSegundoPrazo = alvara.segundoPrazo || alvara.prazoRegularizacao;
        if (effectiveSegundoPrazo && now > effectiveSegundoPrazo) {
          if (alvara.statusId !== statusInapto?.id &&
              alvara.statusId !== status1PrazoVencido?.id &&
              alvara.statusId !== statusEmProcesso?.id &&
              alvara.statusId !== status2PrazoVencido?.id) {
            newStatusId = statusInapto?.id || null;
            needsUpdate = true;
          }
        }
      }
      
      if (needsUpdate) {
        await db.update(alvaras)
          .set({ 
            statusId: newStatusId,
            updatedAt: now 
          })
          .where(eq(alvaras.id, alvara.id));
      }
    }
    
    console.log('[STORAGE] verificarEAtualizarPrazos - Concluído');
    } catch (error) {
      console.error('[STORAGE ERROR] Erro em verificarEAtualizarPrazos:', error);
      console.error('[STORAGE ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
      throw error; // Re-throw para que o erro seja capturado no endpoint
    }
  }
}

// Create storage instance and initialize
const postgresStorage = new PostgresStorage();
postgresStorage.initializeDefaultData().catch(console.error);

export const storage = postgresStorage;
