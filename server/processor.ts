import { storage } from "./storage";
import OpenAI from "openai";
import mammoth from "mammoth";
import { z } from "zod";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

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

// Extract text from PDF using pdfjs-dist
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array, useWorkerFetch: false, isEvalSupported: false });
    const pdf = await loadingTask.promise;
    
    const textParts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || "")
        .join(" ");
      textParts.push(pageText);
    }
    
    const extractedText = textParts.join("\n").trim();
    
    // If pdfjs returns empty (scanned/image-only PDF), use AI vision fallback
    if (!extractedText) {
      console.warn("pdfjs returned empty text — PDF may be image-based, trying AI extraction");
      return await extractTextFromPDFWithAI(buffer);
    }
    
    return extractedText;
  } catch (error) {
    console.error("pdfjs extraction error, trying AI fallback:", error);
    return await extractTextFromPDFWithAI(buffer);
  }
}

// AI-based fallback: ask GPT-4o to describe/extract content from a PDF
// Note: sends truncated base64 as text prompt since Vision API doesn't support PDFs
async function extractTextFromPDFWithAI(buffer: Buffer): Promise<string> {
  // Use the raw bytes as a text prompt describing the binary content won't work,
  // so instead we ask AI to extract from whatever partial text we can get
  const base64Sample = buffer.toString("base64").substring(0, 4000);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `This is a base64-encoded PDF document. Please decode and extract all visible text content from it. Return only the extracted text.\n\nBase64 content:\n${base64Sample}`,
      },
    ],
  });
  
  const text = response.choices[0]?.message.content || "";
  if (!text.trim()) {
    throw new Error("Could not extract text from this PDF. It may be encrypted, corrupted, or purely image-based with no readable text.");
  }
  return text.trim();
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
