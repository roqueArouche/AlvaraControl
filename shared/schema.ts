import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tiposAlvara = pgTable("tipos_alvara", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const statusAlvara = pgTable("status_alvara", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cor: text("cor").notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alvaras = pgTable("alvaras", {
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
  prazoRegularizacao: timestamp("prazo_regularizacao"), // Deprecated - use segundoPrazo
  primeiroPrazo: timestamp("primeiro_prazo"),
  segundoPrazo: timestamp("segundo_prazo"), // Required in insert schema but nullable in DB for compatibility
  tipoLicencaId: varchar("tipo_licenca_id").references(() => tiposAlvara.id),
  statusId: varchar("status_id").references(() => statusAlvara.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTipoAlvaraSchema = createInsertSchema(tiposAlvara).omit({
  id: true,
  createdAt: true,
});

export const insertStatusAlvaraSchema = createInsertSchema(statusAlvara).omit({
  id: true,
  createdAt: true,
});

export const insertAlvaraSchema = createInsertSchema(alvaras).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  prazoRegularizacao: true, // Deprecated field
}).extend({
  dataNotificacao: z.string().optional().nullable(),
  dataVisita: z.string().optional().nullable(),
  primeiroPrazo: z.string().optional().nullable(),
  segundoPrazo: z.string().optional().nullable(), // Optional - only filled when client appears or first deadline expires
  imagemLocal: z.string().optional().nullable(),
  observacoes: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional().nullable(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTipoAlvara = z.infer<typeof insertTipoAlvaraSchema>;
export type TipoAlvara = typeof tiposAlvara.$inferSelect;

export type InsertStatusAlvara = z.infer<typeof insertStatusAlvaraSchema>;
export type StatusAlvara = typeof statusAlvara.$inferSelect;

export type InsertAlvara = z.infer<typeof insertAlvaraSchema>;
export type Alvara = typeof alvaras.$inferSelect;

// Extended types with relations
export type AlvaraWithRelations = Alvara & {
  tipoLicenca?: TipoAlvara;
  status?: StatusAlvara;
};

export type DashboardStats = {
  semRegularizacao: number;
  notificados: number;
  prazoVencido: number;
  regulares: number;
  total: number;
};
