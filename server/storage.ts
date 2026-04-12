import { desc, eq, inArray } from "drizzle-orm";

import {
  documents,
  entities,
  tags,
  type Document,
  type Entity,
  type InsertDocument,
  type InsertEntity,
  type InsertTag,
  type Tag,
} from "../shared/schema.js";
import { db, initializeDatabase } from "./db.js";

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
  getDocument(
    id: number,
  ): Promise<(Document & { entities: Entity[]; tags: Tag[] }) | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(
    id: number,
    updates: Partial<InsertDocument>,
  ): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  createEntity(entity: InsertEntity): Promise<Entity>;
  getEntitiesForDocument(documentId: number): Promise<Entity[]>;

  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<void>;
  getTagsForDocument(documentId: number): Promise<Tag[]>;

  getStats(): Promise<AnalyticsStats>;
}

function nowDate() {
  return new Date();
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function buildTypeLabel(mimeType: string | null | undefined) {
  if (mimeType === "application/pdf") return "PDF";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }
  if (mimeType === "text/plain") return "TXT";
  if (mimeType?.startsWith("image/")) return "Image";
  return "Other";
}

class PostgresStorage implements IStorage {
  private async ensureReady() {
    await initializeDatabase();
  }

  private applyQueryFilter(docs: Document[], query?: string) {
    if (!query) return docs;

    const lower = query.toLowerCase();
    return docs.filter((doc) => {
      return (
        normalizeText(doc.filename).includes(lower) ||
        normalizeText(doc.summary).includes(lower) ||
        normalizeText(doc.content).includes(lower) ||
        normalizeText(doc.classification).includes(lower)
      );
    });
  }

  async getDocuments(query?: string): Promise<(Document & { tags?: Tag[] })[]> {
    await this.ensureReady();

    const docs = await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt), desc(documents.id));

    const filteredDocs = this.applyQueryFilter(docs, query);
    const docIds = filteredDocs.map((doc) => doc.id);
    const allTags = docIds.length
      ? await db.select().from(tags).where(inArray(tags.documentId, docIds))
      : [];

    const tagsByDocumentId = new Map<number, Tag[]>();
    for (const tag of allTags) {
      const list = tagsByDocumentId.get(tag.documentId) ?? [];
      list.push(tag);
      tagsByDocumentId.set(tag.documentId, list);
    }

    return filteredDocs.map((doc) => ({
      ...doc,
      tags: tagsByDocumentId.get(doc.id) ?? [],
    }));
  }

  async getDocument(
    id: number,
  ): Promise<(Document & { entities: Entity[]; tags: Tag[] }) | undefined> {
    await this.ensureReady();

    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!doc) return undefined;

    const [docEntities, docTags] = await Promise.all([
      db.select().from(entities).where(eq(entities.documentId, id)),
      db.select().from(tags).where(eq(tags.documentId, id)),
    ]);

    return {
      ...doc,
      entities: docEntities,
      tags: docTags,
    };
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    await this.ensureReady();

    const [created] = await db.insert(documents).values(doc).returning();
    if (!created) {
      throw new Error("Failed to create document");
    }

    return created;
  }

  async updateDocument(
    id: number,
    updates: Partial<InsertDocument>,
  ): Promise<Document> {
    await this.ensureReady();

    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();

    if (!updated) {
      throw new Error("Document not found");
    }

    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await this.ensureReady();

    await db.transaction(async (tx) => {
      await tx.delete(entities).where(eq(entities.documentId, id));
      await tx.delete(tags).where(eq(tags.documentId, id));
      await tx.delete(documents).where(eq(documents.id, id));
    });
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    await this.ensureReady();

    const [created] = await db.insert(entities).values(entity).returning();
    if (!created) {
      throw new Error("Failed to create entity");
    }

    return created;
  }

  async getEntitiesForDocument(documentId: number): Promise<Entity[]> {
    await this.ensureReady();

    return db.select().from(entities).where(eq(entities.documentId, documentId));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    await this.ensureReady();

    const [created] = await db.insert(tags).values(tag).returning();
    if (!created) {
      throw new Error("Failed to create tag");
    }

    return created;
  }

  async deleteTag(id: number): Promise<void> {
    await this.ensureReady();

    await db.delete(tags).where(eq(tags.id, id));
  }

  async getTagsForDocument(documentId: number): Promise<Tag[]> {
    await this.ensureReady();

    return db.select().from(tags).where(eq(tags.documentId, documentId));
  }

  async getStats(): Promise<AnalyticsStats> {
    await this.ensureReady();

    const [allDocs, allEntities, allTags] = await Promise.all([
      db.select().from(documents),
      db.select().from(entities),
      db.select().from(tags),
    ]);

    const statusMap: Record<string, number> = {};
    for (const doc of allDocs) {
      statusMap[doc.status] = (statusMap[doc.status] || 0) + 1;
    }

    const typeMap: Record<string, number> = {};
    for (const doc of allDocs) {
      const type = buildTypeLabel(doc.mimeType);
      typeMap[type] = (typeMap[type] || 0) + 1;
    }

    const classMap: Record<string, number> = {};
    for (const doc of allDocs) {
      if (doc.classification) {
        classMap[doc.classification] = (classMap[doc.classification] || 0) + 1;
      }
    }

    const entityTypeMap: Record<string, number> = {};
    for (const entity of allEntities) {
      entityTypeMap[entity.entityType] = (entityTypeMap[entity.entityType] || 0) + 1;
    }

    const dateMap: Record<string, number> = {};
    const now = nowDate();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dateMap[d.toISOString().slice(0, 10)] = 0;
    }

    for (const doc of allDocs) {
      const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue;

      const date = createdAt.toISOString().slice(0, 10);
      if (date in dateMap) {
        dateMap[date]++;
      }
    }

    return {
      totalDocuments: allDocs.length,
      byStatus: Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
      })),
      byType: Object.entries(typeMap).map(([type, count]) => ({ type, count })),
      byClassification: Object.entries(classMap)
        .map(([classification, count]) => ({ classification, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byEntityType: Object.entries(entityTypeMap)
        .map(([entityType, count]) => ({ entityType, count }))
        .sort((a, b) => b.count - a.count),
      recentUploads: Object.entries(dateMap).map(([date, count]) => ({
        date,
        count,
      })),
      totalEntities: allEntities.length,
      totalTags: allTags.length,
    };
  }
}

export const storage = new PostgresStorage();
