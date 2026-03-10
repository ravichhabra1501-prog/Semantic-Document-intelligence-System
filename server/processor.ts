import { storage } from "./storage";
import OpenAI from "openai";
import { createRequire } from "module";
import mammoth from "mammoth";
import { z } from "zod";

const require = createRequire(import.meta.url);

// Load pdf-parse module - it's a CommonJS module
const pdfParseModule = require("pdf-parse");
// The module exports the parse function, sometimes as .default
let pdfParse: any = pdfParseModule;
if (typeof pdfParseModule !== 'function' && typeof pdfParseModule.default === 'function') {
  pdfParse = pdfParseModule.default;
}

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

// Extract text from PDF using pdf-parse
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Try to use pdf-parse - handle it if it's not loaded correctly
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(buffer);
      return (data.text || "").trim();
    } else {
      // Fallback: use Vision API to extract text from PDF
      console.warn("PDF parsing library not available, using Vision API fallback");
      const base64Pdf = buffer.toString("base64");
      
      // Use GPT-4o's vision to read the PDF
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this PDF document. Return the complete extracted text.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      });
      
      const extractedText = visionResponse.choices[0]?.message.content || "";
      return extractedText.trim();
    }
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
    } else if (mimeType.startsWith("image/")) {
      // Use vision API for images
      const base64Image = buffer.toString("base64");
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: "Extract all text from this image. Return only the text content, nothing else.",
              },
            ],
          },
        ],
      });
      content = visionResponse.choices[0]?.message.content || "";
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
${content.substring(0, 8000)}

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

    // Ensure classification is never null/empty
    const classification = (analysis.classification || "Unclassified").trim() || "Unclassified";

    // 3. Update document with content, summary, classification
    await storage.updateDocument(id, {
      content,
      summary: analysis.summary,
      classification,
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
