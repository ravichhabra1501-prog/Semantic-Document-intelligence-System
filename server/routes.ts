import { api } from "../shared/routes.js";
import { requireAuthenticatedUser } from "./auth.js";
import { processDocument } from "./processor.js";
import { storage } from "./storage.js";

export async function registerRoutes(app: any): Promise<void> {
  app.get(api.documents.list.path, async (req: any, res: any) => {
    try {
      if (!(await requireAuthenticatedUser(req, res))) {
        return;
      }

      const query = req.query.query as string | undefined;
      const documents = await storage.getDocuments(query);
      res.send(documents);
    } catch (err) {
      res.status(500).send({ message: "Failed to list documents" });
    }
  });

  app.get(api.documents.get.path, async (req: any, res: any) => {
    try {
      if (!(await requireAuthenticatedUser(req, res))) {
        return;
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).send({ message: "Invalid ID" });
      }

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).send({ message: "Document not found" });
      }

      res.send(document);
    } catch (err) {
      res.status(500).send({ message: "Failed to get document" });
    }
  });

  app.post(api.documents.upload.path, async (req: any, res: any) => {
    try {
      if (!(await requireAuthenticatedUser(req, res))) {
        return;
      }

      const data = await req.file();
      if (!data) {
        return res.status(400).send({ message: "No file provided" });
      }

      if (data.file.truncated) {
        return res
          .status(413)
          .send({ message: "File too large. Max size is 50MB." });
      }

      const file = {
        originalname: data.filename,
        mimetype: data.mimetype,
        buffer: await data.toBuffer(),
        size: data.file.bytesRead,
      };

      // Create initial pending document record
      const doc = await storage.createDocument({
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        status: "pending",
      });

      // Process immediately (removing the background queue as requested)
      try {
        await processDocument(doc.id, file.buffer, file.mimetype);
        // Fetch the updated document to return to the client
        const updatedDoc = await storage.getDocument(doc.id);
        res.status(201).send(updatedDoc || doc);
      } catch (err) {
        console.error(`Failed to process document ${doc.id}:`, err);
        const failedDoc = await storage.updateDocument(doc.id, {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
        res.status(201).send(failedDoc);
      }
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).send({ message: "Failed to upload document" });
    }
  });

  app.delete(api.documents.delete.path, async (req: any, res: any) => {
    try {
      if (!(await requireAuthenticatedUser(req, res))) {
        return;
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).send({ message: "Invalid ID" });
      }

      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).send({ message: "Document not found" });
      }

      await storage.deleteDocument(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).send({ message: "Failed to delete document" });
    }
  });

  // Tag endpoints
  app.post(api.tags.create.path, async (req: any, res: any) => {
    try {
      if (!(await requireAuthenticatedUser(req, res))) {
        return;
      }

      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).send({ message: "Invalid document ID" });
      }

      const doc = await storage.getDocument(documentId);
      if (!doc) {
        return res.status(404).send({ message: "Document not found" });
      }

      const { name, color } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).send({ message: "Tag name is required" });
      }

      const tag = await storage.createTag({
        documentId,
        name: name.trim(),
        color: color || "gray",
      });

      res.status(201).send(tag);
    } catch (err) {
      console.error("Tag creation error:", err);
      res.status(500).send({ message: "Failed to create tag" });
    }
  });

  app.delete(api.tags.delete.path, async (req: any, res: any) => {
    try {
      if (!(await requireAuthenticatedUser(req, res))) {
        return;
      }

      const tagId = parseInt(req.params.tagId);
      if (isNaN(tagId)) {
        return res.status(400).send({ message: "Invalid tag ID" });
      }

      await storage.deleteTag(tagId);
      res.status(204).send();
    } catch (err) {
      console.error("Tag deletion error:", err);
      res.status(500).send({ message: "Failed to delete tag" });
    }
  });

  app.get("/api/analytics", async (_req: any, res: any) => {
    try {
      if (!(await requireAuthenticatedUser(_req, res))) {
        return;
      }

      const stats = await storage.getStats();
      res.send(stats);
    } catch (err) {
      console.error("Analytics error:", err);
      res.status(500).send({ message: "Failed to load analytics" });
    }
  });
}
