import {
    type Document,
    type Entity,
    type InsertDocument,
    type InsertEntity,
    type InsertTag,
    type Tag,
} from "@shared/schema";

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

// In-memory storage implementation.
// This removes the need for a database connection and lets the app run without configuring DATABASE_URL.

function nowIso() {
  return new Date().toISOString();
}

export class InMemoryStorage implements IStorage {
  private documents: Document[] = [];
  private entities: Entity[] = [];
  private tags: Tag[] = [];

  private nextDocumentId = 1;
  private nextEntityId = 1;
  private nextTagId = 1;

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private applyQueryFilter(docs: Document[], query?: string) {
    if (!query) return docs;

    const lower = query.toLowerCase();
    return docs.filter((doc) => {
      return (
        String(doc.filename).toLowerCase().includes(lower) ||
        String(doc.summary ?? "")
          .toLowerCase()
          .includes(lower) ||
        String(doc.content ?? "")
          .toLowerCase()
          .includes(lower) ||
        String(doc.classification ?? "")
          .toLowerCase()
          .includes(lower)
      );
    });
  }

  async getDocuments(query?: string): Promise<(Document & { tags?: Tag[] })[]> {
    const docs = this.applyQueryFilter(
      [...this.documents].sort((a, b) =>
        (a.createdAt || "").localeCompare(b.createdAt || ""),
      ),
    );

    const docsWithTags = docs.map((doc) => ({
      ...doc,
      tags: this.tags.filter((t) => t.documentId === doc.id),
    }));

    return this.clone(docsWithTags);
  }

  async getDocument(
    id: number,
  ): Promise<(Document & { entities: Entity[]; tags: Tag[] }) | undefined> {
    const doc = this.documents.find((d) => d.id === id);
    if (!doc) return undefined;

    const docEntities = this.entities.filter((e) => e.documentId === id);
    const docTags = this.tags.filter((t) => t.documentId === id);

    return this.clone({
      ...doc,
      entities: docEntities,
      tags: docTags,
    });
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const nextId = this.nextDocumentId++;
    const now = nowIso();
    const created: Document = {
      id: nextId,
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      content: doc.content ?? null,
      summary: doc.summary ?? null,
      classification: doc.classification ?? null,
      workflow: doc.workflow ?? null,
      diagram: doc.diagram ?? null,
      status: doc.status ?? "pending",
      error: doc.error ?? null,
      createdAt: now,
    } as Document;

    this.documents.push(created);
    return this.clone(created);
  }

  async updateDocument(
    id: number,
    updates: Partial<InsertDocument>,
  ): Promise<Document> {
    const index = this.documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");

    this.documents[index] = {
      ...this.documents[index],
      ...updates,
    } as Document;

    return this.clone(this.documents[index]);
  }

  async deleteDocument(id: number): Promise<void> {
    this.entities = this.entities.filter((e) => e.documentId !== id);
    this.tags = this.tags.filter((t) => t.documentId !== id);
    this.documents = this.documents.filter((d) => d.id !== id);
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    const created: Entity = {
      id: this.nextEntityId++,
      documentId: entity.documentId,
      entityType: entity.entityType,
      value: entity.value,
    } as Entity;

    this.entities.push(created);
    return this.clone(created);
  }

  async getEntitiesForDocument(documentId: number): Promise<Entity[]> {
    return this.clone(this.entities.filter((e) => e.documentId === documentId));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const created: Tag = {
      id: this.nextTagId++,
      documentId: tag.documentId,
      name: tag.name,
      color: tag.color ?? "gray",
      createdAt: nowIso(),
    } as Tag;

    this.tags.push(created);
    return this.clone(created);
  }

  async deleteTag(id: number): Promise<void> {
    this.tags = this.tags.filter((t) => t.id !== id);
  }

  async getTagsForDocument(documentId: number): Promise<Tag[]> {
    return this.clone(this.tags.filter((t) => t.documentId === documentId));
  }

  async getStats(): Promise<AnalyticsStats> {
    const allDocs = [...this.documents];
    const allEntities = [...this.entities];
    const allTags = [...this.tags];

    const statusMap: Record<string, number> = {};
    for (const doc of allDocs) {
      statusMap[doc.status] = (statusMap[doc.status] || 0) + 1;
    }

    const typeMap: Record<string, number> = {};
    for (const doc of allDocs) {
      let type = "Other";
      if (doc.mimeType === "application/pdf") type = "PDF";
      else if (
        doc.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
        type = "DOCX";
      else if (doc.mimeType === "text/plain") type = "TXT";
      else if (doc.mimeType?.startsWith("image/")) type = "Image";
      typeMap[type] = (typeMap[type] || 0) + 1;
    }

    const classMap: Record<string, number> = {};
    for (const doc of allDocs) {
      if (doc.classification) {
        classMap[doc.classification] = (classMap[doc.classification] || 0) + 1;
      }
    }

    const entityTypeMap: Record<string, number> = {};
    for (const e of allEntities) {
      entityTypeMap[e.entityType] = (entityTypeMap[e.entityType] || 0) + 1;
    }

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

export const storage = new InMemoryStorage();
