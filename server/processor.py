from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
import tempfile
from typing import Any

from .models import InsertEntity, UpdateDocument, WorkflowData
from .storage import storage

logger = logging.getLogger(__name__)

OPENAI_API_KEY = (
    os.getenv("AI_INTEGRATIONS_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
).strip()
OPENAI_BASE_URL = (
    os.getenv("AI_INTEGRATIONS_OPENAI_BASE_URL") or os.getenv("OPENAI_BASE_URL") or ""
).strip()


def get_openai_client():
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI

        kwargs: dict[str, Any] = {"api_key": OPENAI_API_KEY}
        if OPENAI_BASE_URL:
            kwargs["base_url"] = OPENAI_BASE_URL
        return OpenAI(**kwargs)
    except Exception as exc:
        logger.warning("OpenAI client unavailable: %s", exc)
        return None


def extract_entities_fallback(content: str) -> list[dict[str, str]]:
    entities: list[dict[str, str]] = []
    patterns = {
        "Person": r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",
        "Organization": r"\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation)\b",
        "Location": r"\b[A-Z][a-z]+, [A-Z]{2}\b",
        "Date": r"\b\d{1,2}/\d{1,2}/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b",
    }
    for entity_type, pattern in patterns.items():
        for match in re.finditer(pattern, content):
            entities.append({"entity_type": entity_type, "value": match.group(0)})
    return entities


def build_fallback_summary(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return "Summary unavailable."
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    summary = " ".join(sentences[:2]).strip() or cleaned
    return f"{summary[:400]}..." if len(summary) > 400 else summary


def build_fallback_classification(text: str) -> str:
    lower = text.lower()
    if not lower:
        return "Unclassified"
    if re.search(r"(invoice|bill|amount due|payment)", lower):
        return "Invoice"
    if re.search(r"(resume|curriculum vitae|education|skills)", lower):
        return "Resume"
    if re.search(r"(agreement|contract|terms and conditions|party)", lower):
        return "Contract"
    if re.search(r"(report|analysis|findings|summary)", lower):
        return "Report"
    if re.search(r"(letter|dear .*|sincerely)", lower):
        return "Letter"
    if re.search(r"(email|from:|to:|subject:)", lower):
        return "Email"
    return "Unclassified"


def to_diagram_node_id(index: int) -> str:
    return f"S{index + 1}"


def build_diagram_from_steps(steps: list[str]) -> str:
    if not steps:
        return "flowchart TD\n  A[No workflow available]"
    nodes = []
    for index, step in enumerate(steps):
        safe_step = step.replace('"', '\\"')
        nodes.append(f'  {to_diagram_node_id(index)}["{safe_step}"]')
    links = [
        f"  {to_diagram_node_id(index)} --> {to_diagram_node_id(index + 1)}"
        for index in range(len(steps) - 1)
    ]
    return "\n".join(["flowchart TD", *nodes, *links])


def build_fallback_workflow(text: str) -> WorkflowData:
    fragments = [
        re.sub(r"\s+", " ", item).strip()
        for item in re.split(r"\n+|(?<=[.!?])\s+", text)
        if item.strip()
    ]
    steps = []
    for index, fragment in enumerate(fragments[:5]):
        snippet = fragment if len(fragment) <= 90 else f"{fragment[:87].strip()}..."
        steps.append(f"{index + 1}. {snippet}")
    normalized_steps = steps or [
        "1. Document is uploaded",
        "2. Text is extracted from the file",
        "3. AI summarizes the document",
        "4. Key entities are identified",
    ]
    return WorkflowData(
        title="Document understanding flow",
        steps=normalized_steps,
        diagram=build_diagram_from_steps(normalized_steps),
    )


def sanitize_json(text: str) -> str:
    return re.sub(r"```json\s*|```", "", text).strip()


def coerce_analysis(result_text: str | None, content: str) -> dict[str, Any]:
    fallback_workflow = build_fallback_workflow(content)
    default_analysis = {
        "summary": build_fallback_summary(content),
        "classification": build_fallback_classification(content),
        "entities": [],
        "workflow": fallback_workflow.model_dump(),
    }

    if not result_text:
        return default_analysis

    for candidate in (result_text, sanitize_json(result_text)):
        try:
            parsed = json.loads(candidate)
            workflow = parsed.get("workflow") or {}
            steps = workflow.get("steps") or fallback_workflow.steps
            return {
                "summary": (parsed.get("summary") or "").strip()
                or build_fallback_summary(content),
                "classification": (parsed.get("classification") or "").strip()
                or build_fallback_classification(content),
                "entities": parsed.get("entities") if isinstance(parsed.get("entities"), list) else [],
                "workflow": {
                    "title": (workflow.get("title") or parsed.get("workflow_title") or fallback_workflow.title),
                    "steps": [str(step).strip() for step in steps if str(step).strip()],
                    "diagram": (
                        parsed.get("diagram")
                        or workflow.get("diagram")
                        or fallback_workflow.diagram
                    ),
                },
            }
        except Exception:
            continue

    return default_analysis


def extract_text_from_plain(buffer: bytes) -> str:
    return buffer.decode("utf-8", errors="ignore")


def extract_text_from_docx(buffer: bytes) -> str:
    try:
        import docx2txt

        with tempfile.NamedTemporaryFile(suffix=".docx", delete=True) as temp_file:
            temp_file.write(buffer)
            temp_file.flush()
            return (docx2txt.process(temp_file.name) or "").strip()
    except Exception as exc:
        logger.warning("DOCX extraction failed: %s", exc)
        return ""


def extract_text_from_pdf(buffer: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(buffer))
        text_parts = [(page.extract_text() or "").strip() for page in reader.pages]
        return "\n".join(part for part in text_parts if part).strip()
    except Exception as exc:
        logger.warning("PDF extraction failed: %s", exc)
        return ""


def extract_text_from_image(buffer: bytes) -> str:
    try:
        from PIL import Image, ImageOps
        import pytesseract

        image = Image.open(io.BytesIO(buffer))
        image = ImageOps.exif_transpose(image)
        grayscale = ImageOps.grayscale(image)
        enhanced = ImageOps.autocontrast(grayscale)
        return pytesseract.image_to_string(enhanced).strip()
    except Exception as exc:
        logger.warning("Image OCR failed: %s", exc)
        return ""


def analyze_image_with_ai(client, buffer: bytes, mime_type: str) -> dict[str, Any]:
    if client is None:
        workflow = build_fallback_workflow("")
        return {
            "content": "",
            "summary": "",
            "classification": "",
            "entities": [],
            "workflow": workflow.model_dump(),
        }

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64.b64encode(buffer).decode('utf-8')}"
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract all readable text, summarize the document, classify it, "
                            "extract entities, create a workflow, and return only JSON with "
                            "keys content, summary, classification, entities, workflow, diagram."
                        ),
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
    )
    message = response.choices[0].message.content if response.choices else None
    try:
        parsed = json.loads(message or "{}")
    except Exception:
        parsed = {}
    workflow = parsed.get("workflow") or {}
    steps = workflow.get("steps") or []
    return {
        "content": parsed.get("content") or "",
        "summary": parsed.get("summary") or "",
        "classification": parsed.get("classification") or "",
        "entities": parsed.get("entities") if isinstance(parsed.get("entities"), list) else [],
        "workflow": {
            "title": workflow.get("title") or "Document understanding flow",
            "steps": steps,
            "diagram": (
                parsed.get("diagram")
                or workflow.get("diagram")
                or build_diagram_from_steps(steps)
            ),
        },
    }


async def process_document(document_id: int, buffer: bytes, mime_type: str) -> None:
    client = get_openai_client()
    try:
        await storage.update_document(
            document_id,
            UpdateDocument(status="processing", error=None),
        )

        normalized_mime = mime_type.lower()
        content = ""

        if normalized_mime == "application/pdf":
            content = extract_text_from_pdf(buffer)
        elif (
            normalized_mime
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ):
            content = extract_text_from_docx(buffer)
        elif normalized_mime == "text/plain":
            content = extract_text_from_plain(buffer)
        elif normalized_mime.startswith("image/"):
            content = extract_text_from_image(buffer)
        else:
            raise ValueError("Unsupported document format")

        analysis_from_image: dict[str, Any] | None = None
        if not content.strip() and normalized_mime.startswith("image/") and client is not None:
            analysis_from_image = analyze_image_with_ai(client, buffer, normalized_mime)
            content = (analysis_from_image.get("content") or "").strip()

        if not content.strip():
            fallback_summary = (
                analysis_from_image.get("summary")
                if analysis_from_image
                else "No text could be extracted from this document."
            )
            fallback_classification = (
                analysis_from_image.get("classification")
                if analysis_from_image
                else "Unclassified"
            )
            fallback_workflow = (
                WorkflowData(**analysis_from_image["workflow"])
                if analysis_from_image
                else build_fallback_workflow("")
            )
            await storage.update_document(
                document_id,
                UpdateDocument(
                    content="",
                    summary=fallback_summary,
                    classification=fallback_classification,
                    workflow=json.dumps(
                        {
                            "title": fallback_workflow.title,
                            "steps": fallback_workflow.steps,
                        }
                    ),
                    diagram=fallback_workflow.diagram,
                    status="completed",
                ),
            )
            return

        if client is None:
            fallback_entities = extract_entities_fallback(content)
            fallback_workflow = build_fallback_workflow(content)
            await storage.update_document(
                document_id,
                UpdateDocument(
                    content=content,
                    summary=build_fallback_summary(content),
                    classification=build_fallback_classification(content),
                    workflow=json.dumps(
                        {
                            "title": fallback_workflow.title,
                            "steps": fallback_workflow.steps,
                        }
                    ),
                    diagram=fallback_workflow.diagram,
                    status="completed",
                ),
            )
            for entity in fallback_entities:
                await storage.create_entity(
                    InsertEntity(
                        documentId=document_id,
                        entityType=entity["entity_type"],
                        value=entity["value"],
                    )
                )
            return

        if analysis_from_image and analysis_from_image.get("summary"):
            analysis = {
                "summary": analysis_from_image["summary"],
                "classification": analysis_from_image["classification"],
                "entities": analysis_from_image["entities"],
                "workflow": analysis_from_image["workflow"],
            }
        else:
            prompt = f"""
Analyze the following document text and provide:
1. A concise summary (2-3 sentences)
2. A classification/category
3. Key entities extracted from the text
4. A workflow object with a short title and 3-6 concise steps
5. A Mermaid flowchart in flowchart TD format that matches the workflow

Document Text:
{content[:10000]}
"""
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            message = response.choices[0].message.content if response.choices else None
            analysis = coerce_analysis(message, content)

        workflow_dict = (
            analysis.get("workflow")
            if isinstance(analysis.get("workflow"), dict)
            else build_fallback_workflow(content).model_dump()
        )
        workflow = WorkflowData(**workflow_dict)
        workflow_steps = workflow.steps or build_fallback_workflow(content).steps
        diagram = workflow.diagram or build_diagram_from_steps(workflow_steps)

        await storage.update_document(
            document_id,
            UpdateDocument(
                content=content,
                summary=(analysis.get("summary") or "").strip()
                or build_fallback_summary(content),
                classification=(analysis.get("classification") or "").strip()
                or "Unclassified",
                workflow=json.dumps(
                    {
                        "title": workflow.title or "Document understanding flow",
                        "steps": workflow_steps,
                    }
                ),
                diagram=diagram,
                status="completed",
            ),
        )

        for entity in analysis.get("entities", []):
            entity_type = entity.get("entity_type")
            value = entity.get("value")
            if entity_type and value:
                await storage.create_entity(
                    InsertEntity(
                        documentId=document_id,
                        entityType=entity_type,
                        value=value,
                    )
                )
    except Exception as exc:
        logger.exception("Process error for document %s", document_id)
        await storage.update_document(
            document_id,
            UpdateDocument(status="failed", error=str(exc)),
        )
