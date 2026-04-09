import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  content: text("content"), // Extracted text
  summary: text("summary"),
  classification: text("classification"),
  workflow: text("workflow"), // JSON string: { title, steps[] }
  diagram: text("diagram"), // Mermaid flowchart text
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  entityType: text("entity_type").notNull(),
  value: text("value").notNull(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  name: text("name").notNull(),
  color: text("color").default("gray"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const documentsRelations = relations(documents, ({ many }) => ({
  entities: many(entities),
  tags: many(tags),
}));

export const entitiesRelations = relations(entities, ({ one }) => ({
  document: one(documents, {
    fields: [entities.documentId],
    references: [documents.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
  document: one(documents, {
    fields: [tags.documentId],
    references: [documents.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertEntitySchema = createInsertSchema(entities).omit({ id: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type DocumentWithEntities = Document & {
  entities: Entity[];
  tags?: Tag[];
};
