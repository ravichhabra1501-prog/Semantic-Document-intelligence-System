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

      // Process in background
      processDocument(doc.id, file.buffer, file.mimetype, file.originalname)
        .catch(err => {
          console.error(`Failed to process document ${doc.id}:`, err);
          storage.updateDocument(doc.id, { 
            status: "failed", 
            error: err instanceof Error ? err.message : String(err) 
          }).catch(console.error);
        });

      res.status(201).json(doc);
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

  return httpServer;
}
