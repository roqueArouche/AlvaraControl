var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  alvaras: () => alvaras,
  insertAlvaraSchema: () => insertAlvaraSchema,
  insertStatusAlvaraSchema: () => insertStatusAlvaraSchema,
  insertTipoAlvaraSchema: () => insertTipoAlvaraSchema,
  insertUserSchema: () => insertUserSchema,
  statusAlvara: () => statusAlvara,
  tiposAlvara: () => tiposAlvara,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var tiposAlvara = pgTable("tipos_alvara", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow()
});
var statusAlvara = pgTable("status_alvara", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cor: text("cor").notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow()
});
var alvaras = pgTable("alvaras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nomeContribuinte: text("nome_contribuinte").notNull(),
  cpf: text("cpf").notNull(),
  endereco: text("endereco").notNull(),
  bairro: text("bairro").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  imagemLocal: text("imagem_local"),
  observacoes: text("observacoes"),
  dataNotificacao: timestamp("data_notificacao"),
  dataVisita: timestamp("data_visita"),
  prazoRegularizacao: timestamp("prazo_regularizacao"),
  // Deprecated - use segundoPrazo
  primeiroPrazo: timestamp("primeiro_prazo"),
  segundoPrazo: timestamp("segundo_prazo"),
  // Required in insert schema but nullable in DB for compatibility
  tipoLicencaId: varchar("tipo_licenca_id").references(() => tiposAlvara.id),
  statusId: varchar("status_id").references(() => statusAlvara.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertTipoAlvaraSchema = createInsertSchema(tiposAlvara).omit({
  id: true,
  createdAt: true
});
var insertStatusAlvaraSchema = createInsertSchema(statusAlvara).omit({
  id: true,
  createdAt: true
});
var insertAlvaraSchema = createInsertSchema(alvaras).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  prazoRegularizacao: true
  // Deprecated field
}).extend({
  dataNotificacao: z.string().optional().nullable(),
  dataVisita: z.string().optional().nullable(),
  primeiroPrazo: z.string().optional().nullable(),
  segundoPrazo: z.string().optional().nullable(),
  // Optional - only filled when client appears or first deadline expires
  imagemLocal: z.string().optional().nullable(),
  observacoes: z.string().max(500, "Observa\xE7\xF5es devem ter no m\xE1ximo 500 caracteres").optional().nullable()
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, gte, lte, ilike, or } from "drizzle-orm";
var PostgresStorage = class {
  // Função auxiliar para transformar resultados do DB em AlvaraWithRelations
  mapDbResultToAlvara(dbResult) {
    return {
      id: dbResult.id,
      nomeContribuinte: dbResult.nomeContribuinte,
      cpf: dbResult.cpf,
      endereco: dbResult.endereco,
      bairro: dbResult.bairro,
      latitude: dbResult.latitude,
      longitude: dbResult.longitude,
      imagemLocal: dbResult.imagemLocal,
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
      tipoLicenca: dbResult.tipoLicenca || void 0,
      status: dbResult.status || void 0
    };
  }
  async initializeDefaultData() {
    const existingUser = await this.getUserByUsername("valderlan");
    if (!existingUser) {
      await this.createUser({
        username: "valderlan",
        password: "01012025"
      });
    }
    const existingTipos = await this.getAllTiposAlvara();
    if (existingTipos.length === 0) {
      await this.createTipoAlvara({
        nome: "Funcionamento",
        descricao: "Alvar\xE1 para funcionamento de estabelecimento comercial"
      });
      await this.createTipoAlvara({
        nome: "Comercial",
        descricao: "Licen\xE7a para atividades comerciais"
      });
      await this.createTipoAlvara({
        nome: "Industrial",
        descricao: "Licen\xE7a para atividades industriais"
      });
    }
    const existingStatus = await this.getAllStatusAlvara();
    if (existingStatus.length === 0) {
      await this.createStatusAlvara({
        nome: "Regular",
        cor: "#10b981",
        descricao: "Alvar\xE1 em situa\xE7\xE3o regular"
      });
      await this.createStatusAlvara({
        nome: "Inapto",
        cor: "#ef4444",
        descricao: "Alvar\xE1 com prazo vencido"
      });
      await this.createStatusAlvara({
        nome: "Notificado",
        cor: "#eab308",
        descricao: "Contribuinte foi notificado"
      });
      await this.createStatusAlvara({
        nome: "Em An\xE1lise",
        cor: "#3b82f6",
        descricao: "Documenta\xE7\xE3o em an\xE1lise"
      });
      await this.createStatusAlvara({
        nome: "Suspenso",
        cor: "#6b7280",
        descricao: "Atividades suspensas"
      });
    }
    await this.createStatusesForPrazos();
  }
  async createStatusesForPrazos() {
    const existingStatus = await this.getAllStatusAlvara();
    const statusNames = existingStatus.map((s) => s.nome);
    const requiredStatus = [
      {
        nome: "1\xBA Prazo Vencido",
        cor: "#f97316",
        descricao: "Primeiro prazo de comparecimento vencido"
      },
      {
        nome: "Em Processo de Regulariza\xE7\xE3o",
        cor: "#0ea5e9",
        descricao: "Contribuinte compareceu e est\xE1 em processo de regulariza\xE7\xE3o"
      },
      {
        nome: "2\xBA Prazo Vencido",
        cor: "#dc2626",
        descricao: "Segundo prazo de regulariza\xE7\xE3o vencido"
      }
    ];
    for (const status of requiredStatus) {
      if (!statusNames.includes(status.nome)) {
        await this.createStatusAlvara(status);
      }
    }
  }
  // User methods
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  // Alvara methods
  async getAllAlvaras() {
    try {
      console.log("[STORAGE] getAllAlvaras - Iniciando query do banco");
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
      }).from(alvaras).leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id)).leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id));
      console.log("[STORAGE] getAllAlvaras - Query retornou", result.length, "registros");
      console.log("[STORAGE] getAllAlvaras - Mapeando resultados...");
      const mapped = result.map(this.mapDbResultToAlvara);
      console.log("[STORAGE] getAllAlvaras - Mapeamento conclu\xEDdo:", mapped.length, "registros");
      return mapped;
    } catch (error) {
      console.error("[STORAGE ERROR] Erro em getAllAlvaras:", error);
      console.error("[STORAGE ERROR] Stack:", error instanceof Error ? error.stack : "No stack");
      throw error;
    }
  }
  async getAlvaraById(id) {
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
    }).from(alvaras).leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id)).leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id)).where(eq(alvaras.id, id));
    return result[0] ? this.mapDbResultToAlvara(result[0]) : void 0;
  }
  async createAlvara(insertAlvara) {
    const dataToInsert = {
      ...insertAlvara,
      dataNotificacao: insertAlvara.dataNotificacao ? new Date(insertAlvara.dataNotificacao) : null,
      dataVisita: insertAlvara.dataVisita ? new Date(insertAlvara.dataVisita) : null,
      prazoRegularizacao: null,
      // Deprecated field
      primeiroPrazo: insertAlvara.primeiroPrazo ? new Date(insertAlvara.primeiroPrazo) : null,
      segundoPrazo: insertAlvara.segundoPrazo ? new Date(insertAlvara.segundoPrazo) : null
    };
    const result = await db.insert(alvaras).values(dataToInsert).returning();
    return result[0];
  }
  async updateAlvara(id, updateAlvara) {
    const dataToUpdate = {
      ...updateAlvara,
      dataNotificacao: updateAlvara.dataNotificacao !== void 0 ? updateAlvara.dataNotificacao && updateAlvara.dataNotificacao.trim() !== "" ? new Date(updateAlvara.dataNotificacao) : null : void 0,
      dataVisita: updateAlvara.dataVisita !== void 0 ? updateAlvara.dataVisita && updateAlvara.dataVisita.trim() !== "" ? new Date(updateAlvara.dataVisita) : null : void 0,
      // prazoRegularizacao is deprecated - no longer in insert schema
      primeiroPrazo: updateAlvara.primeiroPrazo !== void 0 ? updateAlvara.primeiroPrazo && updateAlvara.primeiroPrazo.trim() !== "" ? new Date(updateAlvara.primeiroPrazo) : null : void 0,
      segundoPrazo: updateAlvara.segundoPrazo !== void 0 ? updateAlvara.segundoPrazo && updateAlvara.segundoPrazo.trim() !== "" ? new Date(updateAlvara.segundoPrazo) : null : void 0,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const result = await db.update(alvaras).set(dataToUpdate).where(eq(alvaras.id, id)).returning();
    return result[0];
  }
  async deleteAlvara(id) {
    const result = await db.delete(alvaras).where(eq(alvaras.id, id));
    return (result.rowCount || 0) > 0;
  }
  async searchAlvaras(query) {
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
    }).from(alvaras).leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id)).leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id)).where(or(
      ilike(alvaras.nomeContribuinte, `%${query}%`),
      ilike(alvaras.cpf, `%${query}%`),
      ilike(alvaras.endereco, `%${query}%`)
    ));
    return result.map(this.mapDbResultToAlvara);
  }
  async filterAlvarasByStatus(statusId) {
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
    }).from(alvaras).leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id)).leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id)).where(eq(alvaras.statusId, statusId));
    return result.map(this.mapDbResultToAlvara);
  }
  async filterAlvarasByDateRange(startDate, endDate) {
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
    }).from(alvaras).leftJoin(tiposAlvara, eq(alvaras.tipoLicencaId, tiposAlvara.id)).leftJoin(statusAlvara, eq(alvaras.statusId, statusAlvara.id)).where(and(
      gte(alvaras.createdAt, startDate),
      lte(alvaras.createdAt, endDate)
    ));
    return result.map(this.mapDbResultToAlvara);
  }
  // Tipo Alvara methods
  async getAllTiposAlvara() {
    return await db.select().from(tiposAlvara);
  }
  async getTipoAlvaraById(id) {
    const result = await db.select().from(tiposAlvara).where(eq(tiposAlvara.id, id));
    return result[0];
  }
  async createTipoAlvara(tipo) {
    const result = await db.insert(tiposAlvara).values(tipo).returning();
    return result[0];
  }
  async updateTipoAlvara(id, tipo) {
    const result = await db.update(tiposAlvara).set(tipo).where(eq(tiposAlvara.id, id)).returning();
    return result[0];
  }
  async deleteTipoAlvara(id) {
    try {
      const alvarasUsingTipo = await db.select().from(alvaras).where(eq(alvaras.tipoLicencaId, id)).limit(1);
      if (alvarasUsingTipo.length > 0) {
        throw new Error("N\xE3o \xE9 poss\xEDvel excluir este tipo pois existem alvar\xE1s que o utilizam");
      }
      const result = await db.delete(tiposAlvara).where(eq(tiposAlvara.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      if (error.message.includes("alvar\xE1s que o utilizam")) {
        throw error;
      }
      throw new Error("N\xE3o \xE9 poss\xEDvel excluir este tipo pois existem alvar\xE1s que o utilizam");
    }
  }
  // Status Alvara methods
  async getAllStatusAlvara() {
    return await db.select().from(statusAlvara);
  }
  async getStatusAlvaraById(id) {
    const result = await db.select().from(statusAlvara).where(eq(statusAlvara.id, id));
    return result[0];
  }
  async createStatusAlvara(status) {
    const result = await db.insert(statusAlvara).values(status).returning();
    return result[0];
  }
  async updateStatusAlvara(id, status) {
    const result = await db.update(statusAlvara).set(status).where(eq(statusAlvara.id, id)).returning();
    return result[0];
  }
  async deleteStatusAlvara(id) {
    try {
      const alvarasUsingStatus = await db.select().from(alvaras).where(eq(alvaras.statusId, id)).limit(1);
      if (alvarasUsingStatus.length > 0) {
        throw new Error("N\xE3o \xE9 poss\xEDvel excluir este status pois existem alvar\xE1s que o utilizam");
      }
      const result = await db.delete(statusAlvara).where(eq(statusAlvara.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      if (error.message.includes("alvar\xE1s que o utilizam")) {
        throw error;
      }
      throw new Error("N\xE3o \xE9 poss\xEDvel excluir este status pois existem alvar\xE1s que o utilizam");
    }
  }
  // Dashboard methods
  async getDashboardStats() {
    const alvarasList = await db.select().from(alvaras);
    const statusList = await db.select().from(statusAlvara);
    const regularStatus = statusList.find((s) => s.nome === "Regular");
    const inaptoStatus = statusList.find((s) => s.nome === "Inapto");
    const notificadoStatus = statusList.find((s) => s.nome === "Notificado");
    const now = /* @__PURE__ */ new Date();
    const regulares = alvarasList.filter((a) => a.statusId === regularStatus?.id).length;
    const semRegularizacao = alvarasList.filter((a) => a.statusId === inaptoStatus?.id).length;
    const notificados = alvarasList.filter((a) => a.statusId === notificadoStatus?.id).length;
    const prazoVencido = alvarasList.filter((a) => {
      const effectiveSegundoPrazo = a.segundoPrazo || a.prazoRegularizacao;
      return effectiveSegundoPrazo && effectiveSegundoPrazo < now;
    }).length;
    return {
      semRegularizacao,
      notificados,
      prazoVencido,
      regulares,
      total: alvarasList.length
    };
  }
  // Rotina automática de verificação de prazos
  async verificarEAtualizarPrazos() {
    try {
      console.log("[STORAGE] verificarEAtualizarPrazos - Iniciando");
      const now = /* @__PURE__ */ new Date();
      console.log("[STORAGE] Buscando status...");
      const statusList = await this.getAllStatusAlvara();
      console.log("[STORAGE] Status encontrados:", statusList.length);
      const statusNotificado = statusList.find((s) => s.nome === "Notificado");
      const status1PrazoVencido = statusList.find((s) => s.nome === "1\xBA Prazo Vencido");
      const statusEmProcesso = statusList.find((s) => s.nome === "Em Processo de Regulariza\xE7\xE3o");
      const status2PrazoVencido = statusList.find((s) => s.nome === "2\xBA Prazo Vencido");
      const statusInapto = statusList.find((s) => s.nome === "Inapto");
      console.log("[STORAGE] Status necess\xE1rios encontrados:", {
        notificado: !!statusNotificado,
        prazo1Vencido: !!status1PrazoVencido,
        emProcesso: !!statusEmProcesso,
        prazo2Vencido: !!status2PrazoVencido,
        inapto: !!statusInapto
      });
      console.log("[STORAGE] Buscando alvar\xE1s do banco...");
      const alvarasList = await db.select().from(alvaras);
      console.log("[STORAGE] Alvar\xE1s encontrados:", alvarasList.length);
      for (const alvara of alvarasList) {
        let newStatusId = alvara.statusId;
        let needsUpdate = false;
        const effectiveSegundoPrazo = alvara.segundoPrazo || alvara.prazoRegularizacao;
        if (alvara.dataVisita && effectiveSegundoPrazo) {
          if (now > effectiveSegundoPrazo) {
            if (alvara.statusId !== status2PrazoVencido?.id) {
              newStatusId = status2PrazoVencido?.id || null;
              needsUpdate = true;
            }
          } else {
            if (alvara.statusId !== statusEmProcesso?.id && alvara.statusId !== status2PrazoVencido?.id) {
              newStatusId = statusEmProcesso?.id || null;
              needsUpdate = true;
            }
          }
        } else if (alvara.dataNotificacao && alvara.primeiroPrazo) {
          if (now > alvara.primeiroPrazo) {
            if (alvara.statusId !== status1PrazoVencido?.id && alvara.statusId !== statusEmProcesso?.id && alvara.statusId !== status2PrazoVencido?.id) {
              newStatusId = status1PrazoVencido?.id || null;
              needsUpdate = true;
            }
          } else {
            if (alvara.statusId !== statusNotificado?.id && alvara.statusId !== status1PrazoVencido?.id && alvara.statusId !== statusEmProcesso?.id && alvara.statusId !== status2PrazoVencido?.id) {
              newStatusId = statusNotificado?.id || null;
              needsUpdate = true;
            }
          }
        } else {
          const effectiveSegundoPrazo2 = alvara.segundoPrazo || alvara.prazoRegularizacao;
          if (effectiveSegundoPrazo2 && now > effectiveSegundoPrazo2) {
            if (alvara.statusId !== statusInapto?.id && alvara.statusId !== status1PrazoVencido?.id && alvara.statusId !== statusEmProcesso?.id && alvara.statusId !== status2PrazoVencido?.id) {
              newStatusId = statusInapto?.id || null;
              needsUpdate = true;
            }
          }
        }
        if (needsUpdate) {
          await db.update(alvaras).set({
            statusId: newStatusId,
            updatedAt: now
          }).where(eq(alvaras.id, alvara.id));
        }
      }
      console.log("[STORAGE] verificarEAtualizarPrazos - Conclu\xEDdo");
    } catch (error) {
      console.error("[STORAGE ERROR] Erro em verificarEAtualizarPrazos:", error);
      console.error("[STORAGE ERROR] Stack:", error instanceof Error ? error.stack : "No stack");
      throw error;
    }
  }
};
var postgresStorage = new PostgresStorage();
postgresStorage.initializeDefaultData().catch(console.error);
var storage = postgresStorage;

// server/routes.ts
import { z as z2 } from "zod";

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

// server/objectAcl.ts
var ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    // Implement the case for each type of access group to instantiate.
    //
    // For example:
    // case "USER_LIST":
    //   return new UserListAccessGroup(group.id);
    // case "EMAIL_DOMAIN":
    //   return new EmailDomainAccessGroup(group.id);
    // case "GROUP_MEMBER":
    //   return new GroupMemberAccessGroup(group.id);
    // case "SUBSCRIBER":
    //   return new SubscriberAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}

// server/objectStorage.ts
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  // Gets the public object search paths.
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path3) => path3.trim()).filter((path3) => path3.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }
  // Gets the private object directory.
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }
  // Search for a public object from the search paths.
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  // Downloads an object to the response.
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }
  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission
  }) {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? "read" /* READ */
    });
  }
};
function parseObjectPath(path3) {
  if (!path3.startsWith("/")) {
    path3 = `/${path3}`;
  }
  const pathParts = path3.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      res.json({
        success: true,
        user: { id: user.id, username: user.username }
      });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/dashboard/stats", async (req, res) => {
    try {
      await storage.verificarEAtualizarPrazos();
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar estat\xEDsticas" });
    }
  });
  app2.get("/api/alvaras", async (req, res) => {
    try {
      console.log("[API] GET /api/alvaras - Starting request", req.query);
      await storage.verificarEAtualizarPrazos();
      console.log("[API] Prazos verificados");
      const { search, status, startDate, endDate } = req.query;
      let alvaras2 = await storage.getAllAlvaras();
      console.log("[API] getAllAlvaras retornou:", alvaras2.length, "registros");
      if (search && typeof search === "string" && search.trim() !== "") {
        const searchLower = search.toLowerCase().trim();
        alvaras2 = alvaras2.filter(
          (alvara) => alvara.nomeContribuinte?.toLowerCase().includes(searchLower) || alvara.cpf?.toLowerCase().includes(searchLower) || alvara.endereco?.toLowerCase().includes(searchLower) || alvara.bairro?.toLowerCase().includes(searchLower)
        );
        console.log("[API] Ap\xF3s filtro de pesquisa:", alvaras2.length, "registros");
      }
      if (status && typeof status === "string" && status.trim() !== "") {
        alvaras2 = alvaras2.filter((alvara) => alvara.statusId === status);
        console.log("[API] Ap\xF3s filtro de status:", alvaras2.length, "registros");
      }
      if (startDate && typeof startDate === "string" && startDate.trim() !== "") {
        const filterDate = new Date(startDate);
        filterDate.setHours(0, 0, 0, 0);
        if (endDate && typeof endDate === "string" && endDate.trim() !== "") {
          const endFilterDate = new Date(endDate);
          endFilterDate.setHours(23, 59, 59, 999);
          alvaras2 = alvaras2.filter((alvara) => {
            if (!alvara.createdAt) return false;
            const createdAt = new Date(alvara.createdAt);
            return createdAt >= filterDate && createdAt <= endFilterDate;
          });
        } else {
          const endOfDay = new Date(filterDate);
          endOfDay.setHours(23, 59, 59, 999);
          alvaras2 = alvaras2.filter((alvara) => {
            if (!alvara.createdAt) return false;
            const createdAt = new Date(alvara.createdAt);
            return createdAt >= filterDate && createdAt <= endOfDay;
          });
        }
        console.log("[API] Ap\xF3s filtro de data:", alvaras2.length, "registros");
      }
      console.log("[API] Retornando", alvaras2.length, "alvar\xE1s");
      res.json(alvaras2);
    } catch (error) {
      console.error("[API ERROR] Erro ao carregar alvar\xE1s:", error);
      console.error("[API ERROR] Stack:", error instanceof Error ? error.stack : "No stack");
      res.status(500).json({ message: "Erro ao carregar alvar\xE1s" });
    }
  });
  app2.get("/api/alvaras/:id", async (req, res) => {
    try {
      const alvara = await storage.getAlvaraById(req.params.id);
      if (!alvara) {
        return res.status(404).json({ message: "Alvar\xE1 n\xE3o encontrado" });
      }
      res.json(alvara);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar alvar\xE1" });
    }
  });
  app2.post("/api/alvaras", async (req, res) => {
    try {
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
        tipoLicencaId: req.body.tipoLicencaId === "" ? void 0 : req.body.tipoLicencaId,
        statusId: req.body.statusId === "" ? void 0 : req.body.statusId
      };
      const validatedData = insertAlvaraSchema.parse(processedBody);
      const alvara = await storage.createAlvara(validatedData);
      res.status(201).json(alvara);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar alvar\xE1" });
    }
  });
  app2.put("/api/alvaras/:id", async (req, res) => {
    try {
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
        tipoLicencaId: req.body.tipoLicencaId === "" ? void 0 : req.body.tipoLicencaId,
        statusId: req.body.statusId === "" ? void 0 : req.body.statusId
      };
      const validatedData = insertAlvaraSchema.partial().parse(processedBody);
      const alvara = await storage.updateAlvara(req.params.id, validatedData);
      if (!alvara) {
        return res.status(404).json({ message: "Alvar\xE1 n\xE3o encontrado" });
      }
      res.json(alvara);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar alvar\xE1" });
    }
  });
  app2.delete("/api/alvaras/:id", async (req, res) => {
    try {
      const success = await storage.deleteAlvara(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Alvar\xE1 n\xE3o encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir alvar\xE1" });
    }
  });
  app2.get("/api/tipos", async (req, res) => {
    try {
      const tipos = await storage.getAllTiposAlvara();
      res.json(tipos);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar tipos de alvar\xE1" });
    }
  });
  app2.post("/api/tipos", async (req, res) => {
    try {
      const validatedData = insertTipoAlvaraSchema.parse(req.body);
      const tipo = await storage.createTipoAlvara(validatedData);
      res.status(201).json(tipo);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar tipo" });
    }
  });
  app2.put("/api/tipos/:id", async (req, res) => {
    try {
      const validatedData = insertTipoAlvaraSchema.partial().parse(req.body);
      const tipo = await storage.updateTipoAlvara(req.params.id, validatedData);
      if (!tipo) {
        return res.status(404).json({ message: "Tipo n\xE3o encontrado" });
      }
      res.json(tipo);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar tipo" });
    }
  });
  app2.delete("/api/tipos/:id", async (req, res) => {
    try {
      const success = await storage.deleteTipoAlvara(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Tipo n\xE3o encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      if (error.message && error.message.includes("alvar\xE1s que o utilizam")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro ao excluir tipo" });
    }
  });
  app2.get("/api/status", async (req, res) => {
    try {
      const status = await storage.getAllStatusAlvara();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Erro ao carregar status" });
    }
  });
  app2.post("/api/status", async (req, res) => {
    try {
      const validatedData = insertStatusAlvaraSchema.parse(req.body);
      const status = await storage.createStatusAlvara(validatedData);
      res.status(201).json(status);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar status" });
    }
  });
  app2.put("/api/status/:id", async (req, res) => {
    try {
      const validatedData = insertStatusAlvaraSchema.partial().parse(req.body);
      const status = await storage.updateStatusAlvara(req.params.id, validatedData);
      if (!status) {
        return res.status(404).json({ message: "Status n\xE3o encontrado" });
      }
      res.json(status);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });
  app2.delete("/api/status/:id", async (req, res) => {
    try {
      const success = await storage.deleteStatusAlvara(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Status n\xE3o encontrado" });
      }
      res.json({ success: true });
    } catch (error) {
      if (error.message && error.message.includes("alvar\xE1s que o utilizam")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro ao excluir status" });
    }
  });
  app2.get("/api/export/excel", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let alvaras2;
      if (startDate && endDate) {
        alvaras2 = await storage.filterAlvarasByDateRange(
          new Date(startDate),
          new Date(endDate)
        );
      } else {
        alvaras2 = await storage.getAllAlvaras();
      }
      res.json({
        message: "Export functionality would generate Excel file here",
        count: alvaras2.length,
        data: alvaras2
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao exportar dados" });
    }
  });
  app2.get("/api/export/dashboard-pdf", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await storage.getDashboardStats();
      res.json({
        message: "Dashboard PDF export would be generated here",
        stats,
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao exportar dashboard" });
    }
  });
  app2.get("/api/config", (req, res) => {
    res.json({
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY
    });
  });
  app2.post("/api/verificar-prazos", async (req, res) => {
    try {
      await storage.verificarEAtualizarPrazos();
      res.json({ success: true, message: "Verifica\xE7\xE3o de prazos executada com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao executar verifica\xE7\xE3o de prazos" });
    }
  });
  app2.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/alvara-images", async (req, res) => {
    if (!req.body.imagemLocalURL) {
      return res.status(400).json({ error: "imagemLocalURL is required" });
    }
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imagemLocalURL
      );
      res.status(200).json({
        objectPath
      });
    } catch (error) {
      console.error("Error setting alvara image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({ limit: "20mb" }));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
