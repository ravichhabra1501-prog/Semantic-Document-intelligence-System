import { db } from "./db";
import { documents, entities, tags, type InsertDocument, type Document, type Entity, type InsertEntity, type Tag, type InsertTag } from "@shared/schema";
import { eq, like, desc, or, sql } from "drizzle-orm";

export interface AnalyticsStats {
  totalDocuments: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  byClassification: { classification: string; count: number }[];
  byEntityType: { entityType: string; count: number }[];
  recentUploads: { date: string; count: number }[];
  totalEntities: number;
  totalTags: number;
}

export interface IStorage {
  getDocuments(query?: string): Promise<(Document & { tags?: Tag[] })[]>;
  getDocument(id: number): Promise<(Document & { entities: Entity[]; tags: Tag[] }) | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  
  createEntity(entity: InsertEntity): Promise<Entity>;
  getEntitiesForDocument(documentId: number): Promise<Entity[]>;
  
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<void>;
  getTagsForDocument(documentId: number): Promise<Tag[]>;
  
  getStats(): Promise<AnalyticsStats>;
}

export class DatabaseStorage implements IStorage {
  async getDocuments(query?: string): Promise<(Document & { tags?: Tag[] })[]> {
    let docs: Document[];
    if (query) {
      // Very basic keyword search to simulate semantic search fallback
      // Since real semantic search requires pgvector which we haven't set up yet
      // In a real app we'd use pgvector or OpenAI embeddings here
      const term = `%${query}%`;
      docs = await db.select().from(documents)
        .where(or(
          like(documents.filename, term),
          like(documents.summary, term),
          like(documents.content, term),
          like(documents.classification, term)
        ))
        .orderBy(desc(documents.createdAt));
    } else {
      docs = await db.select().from(documents).orderBy(desc(documents.createdAt));
    }

    // Fetch tags for each document
    const docsWithTags = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        tags: await db.select().from(tags).where(eq(tags.documentId, doc.id)),
      }))
    );

    return docsWithTags;
  }

  async getDocument(id: number): Promise<(Document & { entities: Entity[]; tags: Tag[] }) | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    if (!doc) return undefined;

    const docEntities = await db.select().from(entities).where(eq(entities.documentId, id));
    const docTags = await db.select().from(tags).where(eq(tags.documentId, id));
    
    return {
      ...doc,
      entities: docEntities,
      tags: docTags,
    };
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async updateDocument(id: number, updates: Partial<InsertDocument>): Promise<Document> {
    const [updated] = await db.update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(entities).where(eq(entities.documentId, id));
    await db.delete(tags).where(eq(tags.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    const [created] = await db.insert(entities).values(entity).returning();
    return created;
  }

  async getEntitiesForDocument(documentId: number): Promise<Entity[]> {
    return await db.select().from(entities).where(eq(entities.documentId, documentId));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [created] = await db.insert(tags).values(tag).returning();
    return created;
  }

  async deleteTag(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  async getTagsForDocument(documentId: number): Promise<Tag[]> {
    return await db.select().from(tags).where(eq(tags.documentId, documentId));
  }

  async getStats(): Promise<AnalyticsStats> {
    const allDocs = await db.select().from(documents).orderBy(desc(documents.createdAt));
    const allEntities = await db.select().from(entities);
    const allTags = await db.select().from(tags);

    // By status
    const statusMap: Record<string, number> = {};
    for (const doc of allDocs) {
      statusMap[doc.status] = (statusMap[doc.status] || 0) + 1;
    }
    const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // By MIME type
    const typeMap: Record<string, number> = {};
    for (const doc of allDocs) {
      let type = "Other";
      if (doc.mimeType === "application/pdf") type = "PDF";
      else if (doc.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") type = "DOCX";
      else if (doc.mimeType === "text/plain") type = "TXT";
      else if (doc.mimeType?.startsWith("image/")) type = "Image";
      typeMap[type] = (typeMap[type] || 0) + 1;
    }
    const byType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

    // By classification (top 10)
    const classMap: Record<string, number> = {};
    for (const doc of allDocs) {
      if (doc.classification) {
        classMap[doc.classification] = (classMap[doc.classification] || 0) + 1;
      }
    }
    const byClassification = Object.entries(classMap)
      .map(([classification, count]) => ({ classification, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By entity type
    const entityTypeMap: Record<string, number> = {};
    for (const e of allEntities) {
      entityTypeMap[e.entityType] = (entityTypeMap[e.entityType] || 0) + 1;
    }
    const byEntityType = Object.entries(entityTypeMap)
      .map(([entityType, count]) => ({ entityType, count }))
      .sort((a, b) => b.count - a.count);

    // Recent uploads (last 14 days)
    const dateMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dateMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const doc of allDocs) {
      const date = new Date(doc.createdAt || 0).toISOString().slice(0, 10);
      if (date in dateMap) {
        dateMap[date]++;
      }
    }
    const recentUploads = Object.entries(dateMap).map(([date, count]) => ({ date, count }));

    return {
      totalDocuments: allDocs.length,
      byStatus,
      byType,
      byClassification,
      byEntityType,
      recentUploads,
      totalEntities: allEntities.length,
      totalTags: allTags.length,
    };
  }
}

export const storage = new DatabaseStorage();
