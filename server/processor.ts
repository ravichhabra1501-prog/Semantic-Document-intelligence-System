import { storage } from "./storage";
import OpenAI from "openai";
import { createRequire } from "module";
import mammoth from "mammoth";
import { z } from "zod";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const entitiesSchema = z.object({
  entities: z.array(z.object({
    entity_type: z.enum(["Person", "Organization", "Location", "Date", "Other"]),
    value: z.string(),
  }))
});

// Extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function processDocument(id: number, buffer: Buffer, mimeType: string, filename: string) {
  try {
    await storage.updateDocument(id, { status: "processing" });

    let content = "";
    
    // 1. Extract text based on format
    if (mimeType === "application/pdf") {
      content = await extractTextFromPDF(buffer);
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (mimeType === "text/plain") {
      content = buffer.toString("utf8");
    } else {
      throw new Error("Unsupported document format");
    }

    if (!content.trim()) {
      throw new Error("No text could be extracted from the document");
    }

    // 2. Classify, Summarize, and Extract Entities using AI
    // We do this in a single prompt to save time/tokens, requesting JSON output
    const prompt = `
Analyze the following document text and provide:
1. A concise summary (2-3 sentences)
2. A classification/category (e.g., Invoice, Contract, Article, Resume, Letter, etc.)
3. Key entities extracted from the text (Persons, Organizations, Locations, Dates, Other).

Document Text:
${content.substring(0, 8000)} // Limiting length to avoid token limits for very large docs

Respond ONLY with a JSON object in this exact format:
{
  "summary": "...",
  "classification": "...",
  "entities": [
    { "entity_type": "Person|Organization|Location|Date|Other", "value": "..." }
  ]
}
`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const resultText = aiResponse.choices[0]?.message.content;
    if (!resultText) throw new Error("AI returned empty response");

    const analysis = JSON.parse(resultText);

    // 3. Update document with content, summary, classification
    await storage.updateDocument(id, {
      content,
      summary: analysis.summary,
      classification: analysis.classification,
      status: "completed"
    });

    // 4. Store entities
    if (Array.isArray(analysis.entities)) {
      for (const entity of analysis.entities) {
        if (entity.entity_type && entity.value) {
          await storage.createEntity({
            documentId: id,
            entityType: entity.entity_type,
            value: entity.value
          });
        }
      }
    }

  } catch (error) {
    console.error(`Process error for document ${id}:`, error);
    await storage.updateDocument(id, { 
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
