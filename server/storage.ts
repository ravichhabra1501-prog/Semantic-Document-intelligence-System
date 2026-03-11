import { db } from "./db";
import { documents, entities, tags, type InsertDocument, type Document, type Entity, type InsertEntity, type Tag, type InsertTag } from "@shared/schema";
import { eq, like, desc, or } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
