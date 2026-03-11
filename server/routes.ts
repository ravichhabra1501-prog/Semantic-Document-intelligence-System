import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { processDocument } from "./processor";

// Use memory storage for uploads, process them, and store text in DB
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.documents.list.path, async (req, res) => {
    try {
      const query = req.query.query as string | undefined;
      const documents = await storage.getDocuments(query);
      res.json(documents);
    } catch (err) {
      res.status(500).json({ message: "Failed to list documents" });
    }
  });

  app.get(api.documents.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (err) {
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  app.post(api.documents.upload.path, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const file = req.file;
      
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
        await processDocument(doc.id, file.buffer, file.mimetype, file.originalname);
        // Fetch the updated document to return to the client
        const updatedDoc = await storage.getDocument(doc.id);
        res.status(201).json(updatedDoc || doc);
      } catch (err) {
        console.error(`Failed to process document ${doc.id}:`, err);
        const failedDoc = await storage.updateDocument(doc.id, { 
          status: "failed", 
          error: err instanceof Error ? err.message : String(err) 
        });
        res.status(201).json(failedDoc);
      }
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete(api.documents.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.deleteDocument(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Tag endpoints
  app.post(api.tags.create.path, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const doc = await storage.getDocument(documentId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      const { name, color } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Tag name is required" });
      }

      const tag = await storage.createTag({
        documentId,
        name: name.trim(),
        color: color || "gray",
      });

      res.status(201).json(tag);
    } catch (err) {
      console.error("Tag creation error:", err);
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  app.delete(api.tags.delete.path, async (req, res) => {
    try {
      const tagId = parseInt(req.params.tagId);
      if (isNaN(tagId)) {
        return res.status(400).json({ message: "Invalid tag ID" });
      }

      await storage.deleteTag(tagId);
      res.status(204).end();
    } catch (err) {
      console.error("Tag deletion error:", err);
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  return httpServer;
}
