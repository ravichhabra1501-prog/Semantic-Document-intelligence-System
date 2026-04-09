import mammoth from "mammoth";
import OpenAI from "openai";
import pRetry from "p-retry";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { storage } from "./storage";

// Prefer app-specific env vars but fall back to standard OpenAI envs so Vision works locally too.
const rawKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
const openaiApiKey = rawKey.trim() || undefined;
const rawBase =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "";
const openaiBaseUrl = rawBase.trim() || undefined;

const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
      baseURL: openaiBaseUrl,
    })
  : null;

if (openai) {
  console.log(
    `[ai] OpenAI client initialized${openaiBaseUrl ? ` (baseURL=${openaiBaseUrl})` : ""}`,
  );
} else {
  console.warn("[ai] OpenAI disabled: API key not provided");
}

let tesseractWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

async function getTesseractWorker() {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker({
      logger: () => {},
    });
    await tesseractWorker.load();
    await tesseractWorker.loadLanguage("eng");
    await tesseractWorker.initialize("eng");
    // Bias toward paragraph text with LSTM; helps mixed documents/screenshots.
    await tesseractWorker.setParameters(({
      tessedit_pageseg_mode: 6 as any,
      tessedit_ocr_engine_mode: "1",
      // Keep a broad whitelist to avoid dropping symbols while still limiting noise.
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-–—.,:;!?@#%&()[]{}<>+*/\\\"' \n",
    }) as any);
  }
  return tesseractWorker;
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    // First pass: denoise + binarize to give OCR maximum contrast.
    const processed = await sharp(buffer)
      .rotate() // respect EXIF orientation
      .flatten({ background: "#ffffff" }) // remove transparency that can confuse OCR
      .resize({ width: 2000, withoutEnlargement: true }) // upscale modestly to aid small fonts
      .grayscale()
      .normalize()
      .modulate({ brightness: 1.05, saturation: 1.05 })
      .sharpen()
      .threshold(180)
      .median(1) // knock out salt/pepper noise after binarize
      .toBuffer();

    const worker = await getTesseractWorker();
    let { data } = await worker.recognize(processed);
    let text = (data.text || "").trim();

    // If the binarized pass failed (common on low-contrast photos), try a softer pass.
    if (!text) {
      const softened = await sharp(buffer)
        .rotate()
        .flatten({ background: "#ffffff" })
        .resize({ width: 2000, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .modulate({ brightness: 1.1, saturation: 1.1 })
        .toBuffer();

      ({ data } = await worker.recognize(softened));
      text = (data.text || "").trim();
    }

    if (!text) {
      console.warn("Tesseract OCR returned no text from image after two passes");
    }

    return text;
  } catch (error) {
    console.error("Tesseract OCR failed:", error);
    throw new Error("Failed to extract text from image using OCR");
  }
}

// Simple regex-based entity extraction fallback when OpenAI is not available
function extractEntitiesFallback(
  content: string,
): Array<{ entity_type: string; value: string }> {
  const entities: Array<{ entity_type: string; value: string }> = [];

  // Simple patterns for common entities
  const patterns = {
    Person: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Basic name pattern
    Organization: /\b[A-Z][a-z]+ (Inc|Corp|LLC|Ltd|Company|Corporation)\b/g,
    Location: /\b[A-Z][a-z]+, [A-Z]{2}\b/g, // City, State
    Date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g,
  };

  for (const [type, regex] of Object.entries(patterns)) {
    const matches = content.match(regex) || [];
    for (const match of matches) {
      entities.push({ entity_type: type, value: match });
    }
  }

  return entities;
}

function buildFallbackSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Summary unavailable.";

  const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  if (sentences) return sentences.length > 400 ? `${sentences.slice(0, 400)}…` : sentences;

  return cleaned.length > 400 ? `${cleaned.slice(0, 400)}…` : cleaned;
}

function buildFallbackClassification(text: string): string {
  const lower = text.toLowerCase();
  if (!lower) return "Unclassified";
  if (/(invoice|bill|amount due|payment)/.test(lower)) return "Invoice";
  if (/(resume|curriculum vitae|education|skills)/.test(lower)) return "Resume";
  if (/(agreement|contract|terms and conditions|party)/.test(lower)) return "Contract";
  if (/(report|analysis|findings|summary)/.test(lower)) return "Report";
  if (/(letter|dear .*|sincerely)/.test(lower)) return "Letter";
  if (/(email|from:|to:|subject:)/.test(lower)) return "Email";
  return "Unclassified";
}

type WorkflowData = {
  title: string;
  steps: string[];
  diagram: string;
};

function toDiagramNodeId(index: number): string {
  return `S${index + 1}`;
}

function buildDiagramFromSteps(steps: string[]): string {
  if (!steps.length) return "flowchart TD\n  A[No workflow available]";

  const nodes = steps.map((step, index) => {
    const safeStep = step.replace(/"/g, '\\"');
    return `  ${toDiagramNodeId(index)}["${safeStep}"]`;
  });

  const links = steps.slice(1).map((_, index) => {
    return `  ${toDiagramNodeId(index)} --> ${toDiagramNodeId(index + 1)}`;
  });

  return ["flowchart TD", ...nodes, ...links].join("\n");
}

function buildFallbackWorkflow(text: string): WorkflowData {
  const fragments = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const steps = fragments.slice(0, 5).map((fragment, index) => {
    return fragment.length > 90
      ? `${index + 1}. ${fragment.slice(0, 87).trim()}...`
      : `${index + 1}. ${fragment}`;
  });

  const normalizedSteps =
    steps.length > 0
      ? steps
      : [
          "1. Document is uploaded",
          "2. Text is extracted from the file",
          "3. AI summarizes the document",
          "4. Key entities are identified",
        ];

  return {
    title: "Document understanding flow",
    steps: normalizedSteps,
    diagram: buildDiagramFromSteps(normalizedSteps),
  };
}

function sanitizeJson(text: string): string {
  return text.replace(/```json\s*|```/g, "").trim();
}

function coerceAnalysis(resultText: string | null | undefined, content: string) {
  const fallbackWorkflow = buildFallbackWorkflow(content);
  const defaultAnalysis = {
    summary: buildFallbackSummary(content),
    classification: buildFallbackClassification(content),
    entities: [] as Array<{ entity_type: string; value: string }>,
    workflow: fallbackWorkflow,
  };

  if (!resultText) return defaultAnalysis;

  const candidates = [resultText, sanitizeJson(resultText)];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return {
        summary: (parsed.summary || "").trim() || buildFallbackSummary(content),
        classification:
          (parsed.classification || "").trim() ||
          buildFallbackClassification(content),
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        workflow: {
          title:
            parsed.workflow?.title?.trim() ||
            parsed.workflow_title?.trim() ||
            fallbackWorkflow.title,
          steps:
            Array.isArray(parsed.workflow?.steps) &&
            parsed.workflow.steps.length > 0
              ? parsed.workflow.steps.map((step: string) => String(step).trim()).filter(Boolean)
              : fallbackWorkflow.steps,
          diagram:
            parsed.diagram?.trim() ||
            parsed.workflow?.diagram?.trim() ||
            fallbackWorkflow.diagram,
        },
      };
    } catch {
      continue;
    }
  }

  return defaultAnalysis;
}

async function analyzeImageWithAI(buffer: Buffer, mimeType: string) {
  if (!openai) {
    const fallbackWorkflow = buildFallbackWorkflow("");
    return {
      content: "",
      summary: "",
      classification: "",
      entities: [] as Array<{ entity_type: string; value: string }>,
      workflow: fallbackWorkflow,
    };
  }

  const base64Image = buffer.toString("base64");

  const response = await pRetry(
    async () => {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
              {
                type: "text",
                text: `You are processing a document image. 
1) Extract all readable text verbatim. 
2) Provide a 2-3 sentence summary. 
3) Provide a classification/category for the document (Invoice, Contract, Receipt, Report, Resume, Letter, Email, Form, Other). 
4) Extract entities as JSON array [{ "entity_type": "...", "value": "..." }] (Persons, Organizations, Locations, Dates, Other).
5) Create a workflow object with a short title and 3-6 concise steps.
6) Create a Mermaid flowchart in flowchart TD format that matches the workflow.

Respond ONLY as JSON with keys: content, summary, classification, entities, workflow, diagram.`,
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });
      const text = res.choices[0]?.message.content;
      if (!text || !text.trim()) throw new Error("Empty Vision JSON response");
      return text;
    },
    { retries: 2, factor: 1.8 },
  );

  try {
    const parsed = JSON.parse(response);
    return {
      content: parsed.content || "",
      summary: parsed.summary || "",
      classification: parsed.classification || "",
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      workflow: {
        title: parsed.workflow?.title || "Document understanding flow",
        steps: Array.isArray(parsed.workflow?.steps) ? parsed.workflow.steps : [],
        diagram:
          parsed.diagram ||
          parsed.workflow?.diagram ||
          buildDiagramFromSteps(
            Array.isArray(parsed.workflow?.steps) ? parsed.workflow.steps : [],
          ),
      },
    };
  } catch (err) {
    console.error("Failed to parse Vision JSON response:", err, response);
    return {
      content: "",
      summary: "",
      classification: "",
      entities: [],
      workflow: buildFallbackWorkflow(""),
    };
  }
}

// Extract text from PDF using pdfjs-dist
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
    });
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

    // If pdfjs returns empty (scanned/image-only PDF), attempt AI extraction if available.
    if (!extractedText) {
      console.warn("pdfjs returned empty text — PDF may be image-based.");
      if (openai) {
        return await extractTextFromPDFWithAI(buffer);
      }
      return "";
    }

    return extractedText;
  } catch (error) {
    console.error("pdfjs extraction error:", error);
    if (openai) {
      return await extractTextFromPDFWithAI(buffer);
    }
    return "";
  }
}

// AI-based fallback: ask GPT-4o to describe/extract content from a PDF
// Note: sends truncated base64 as text prompt since Vision API doesn't support PDFs
async function extractTextFromPDFWithAI(buffer: Buffer): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI is not configured for PDF fallback extraction");
  }

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
    throw new Error(
      "Could not extract text from this PDF. It may be encrypted, corrupted, or purely image-based with no readable text.",
    );
  }
  return text.trim();
}

export async function processDocument(
  id: number,
  buffer: Buffer,
  mimeType: string,
) {
  try {
    await storage.updateDocument(id, { status: "processing" });

    let content = "";
    const normalizedMime = mimeType.toLowerCase();

    // 1. Extract text based on format
    if (normalizedMime === "application/pdf") {
      content = await extractTextFromPDF(buffer);
    } else if (
      normalizedMime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
      } catch (error) {
        console.error("mammoth DOCX extraction failed:", error);
        content = "";
      }
    } else if (normalizedMime === "text/plain") {
      content = buffer.toString("utf8");
    } else if (normalizedMime.startsWith("image/")) {
      // Prefer local OCR so images work even without an OpenAI API key.
      try {
        content = await extractTextFromImage(buffer);
      } catch (ocrError) {
        console.warn(
          "Local OCR failed for image, falling back to OpenAI if available:",
          ocrError,
        );
      }

      // If OCR produced little/no text, and OpenAI is configured, try the Vision API as a fallback.
      const tooShort = content.trim().length < 30;
      if ((tooShort || !content.trim()) && openai) {
        try {
          const base64Image = buffer.toString("base64");
          console.log("[ai] Using Vision fallback for image (initial OCR length:", content.length, ")");
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
                    text: "Extract every visible character from this image (including numbers and small text). Return ONLY the extracted text, no narration.",
                  },
                ],
              },
            ],
          });
          const visionText = visionResponse.choices[0]?.message.content || "";
          if (visionText.trim()) {
            content = visionText.trim();
            console.log("[ai] Vision extracted", content.length, "characters");
          } else {
            console.warn("[ai] Vision fallback returned empty text");
          }
        } catch (visionError) {
          console.error("OpenAI Vision extraction failed:", visionError);
        }
      }

      // If still no text, we'll attempt full Vision analysis later.
    } else {
      throw new Error("Unsupported document format");
    }

    let analysisFromImage: {
      content: string;
      summary: string;
      classification: string;
      entities: Array<{ entity_type: string; value: string }>;
      workflow: WorkflowData;
    } | null = null;

    // If after OCR we still have no text and this is an image and OpenAI is available, ask Vision to extract+analyze directly.
    if (!content.trim() && normalizedMime.startsWith("image/") && openai) {
      console.log("[ai] OCR empty; requesting Vision to extract and analyze image directly");
      analysisFromImage = await analyzeImageWithAI(buffer, normalizedMime);
      content = (analysisFromImage.content || "").trim();
    }

    if (!content.trim()) {
      const fallbackSummary =
        analysisFromImage?.summary || "No text could be extracted from this document.";
      const fallbackClassification =
        analysisFromImage?.classification || "Unclassified";
      const fallbackWorkflow = analysisFromImage?.workflow || buildFallbackWorkflow("");
      await storage.updateDocument(id, {
        content,
        summary: fallbackSummary,
        classification: fallbackClassification,
        workflow: JSON.stringify({
          title: fallbackWorkflow.title,
          steps: fallbackWorkflow.steps,
        }),
        diagram: fallbackWorkflow.diagram,
        status: "completed",
      });
      return;
    }

    // If the OpenAI API key is not configured, fall back to heuristic summaries/classification.
    if (!openai) {
      const fallbackEntities = extractEntitiesFallback(content);
      const fallbackWorkflow = buildFallbackWorkflow(content);
      await storage.updateDocument(id, {
        content,
        summary: buildFallbackSummary(content),
        classification: buildFallbackClassification(content),
        workflow: JSON.stringify({
          title: fallbackWorkflow.title,
          steps: fallbackWorkflow.steps,
        }),
        diagram: fallbackWorkflow.diagram,
        status: "completed",
      });

      // Store fallback entities
      for (const entity of fallbackEntities) {
        await storage.createEntity({
          documentId: id,
          entityType: entity.entity_type,
          value: entity.value,
        });
      }
      return;
    }

    // 2. Classify, Summarize, and Extract Entities using AI
    // We do this in a single prompt to save time/tokens, requesting JSON output
    const prompt = `
Analyze the following document text and provide:
1. A concise summary (2-3 sentences)
2. A classification/category (e.g., Invoice, Contract, Article, Resume, Letter, etc.)
3. Key entities extracted from the text (Persons, Organizations, Locations, Dates, Other).
4. A workflow object with a short title and 3-6 concise steps that explain the process, sequence, or structure described in the document. If the document is not procedural, convert the key ideas into a logical reading flow.
5. A Mermaid flowchart in flowchart TD format that matches the workflow.

Document Text:
${content.substring(0, 10000)}

Respond ONLY with a JSON object in this exact format:
{
  "summary": "...",
  "classification": "...",
  "entities": [
    { "entity_type": "Person|Organization|Location|Date|Other", "value": "..." }
  ],
  "workflow": {
    "title": "...",
    "steps": ["...", "..."]
  },
  "diagram": "flowchart TD ..."
}
`;

    let analysis;
    try {
      // If we already have Vision-derived analysis (image case), reuse it; otherwise call text model.
      if (analysisFromImage && analysisFromImage.summary) {
        analysis = {
          summary: analysisFromImage.summary,
          classification: analysisFromImage.classification,
          entities: analysisFromImage.entities,
          workflow: analysisFromImage.workflow,
        };
      } else {
        const resultText = await pRetry(
          async () => {
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
            });
            const text = response.choices[0]?.message.content;
            if (!text || !text.trim()) {
              throw new Error("Empty AI response");
            }
            return text;
          },
          { retries: 2, factor: 1.8 },
        );

        analysis = coerceAnalysis(resultText, content);
      }
    } catch (aiError) {
      console.error("AI analysis failed, falling back to heuristics:", aiError);
      analysis = {
        summary: buildFallbackSummary(content),
        classification: buildFallbackClassification(content),
        entities: extractEntitiesFallback(content),
        workflow: buildFallbackWorkflow(content),
      };
    }

    // Ensure classification is never null/empty
    const classification =
      (analysis.classification || "Unclassified").trim() || "Unclassified";
    const summary = (analysis.summary || "").trim() || buildFallbackSummary(content);
    const workflow = analysis.workflow || buildFallbackWorkflow(content);
    const workflowSteps =
      Array.isArray(workflow.steps) && workflow.steps.length > 0
        ? workflow.steps
        : buildFallbackWorkflow(content).steps;
    const diagram =
      (workflow.diagram || "").trim() || buildDiagramFromSteps(workflowSteps);

    // 3. Update document with content, summary, classification
    await storage.updateDocument(id, {
      content,
      summary,
      classification,
      workflow: JSON.stringify({
        title: workflow.title || "Document understanding flow",
        steps: workflowSteps,
      }),
      diagram,
      status: "completed",
    });

    // 4. Store entities
    if (Array.isArray(analysis.entities)) {
      for (const entity of analysis.entities) {
        if (entity.entity_type && entity.value) {
          await storage.createEntity({
            documentId: id,
            entityType: entity.entity_type,
            value: entity.value,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Process error for document ${id}:`, error);
    await storage.updateDocument(id, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
