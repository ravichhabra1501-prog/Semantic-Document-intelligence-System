from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from .models import CreateTagPayload, InsertDocument, InsertTag
from .processor import process_document
from .storage import storage

router = APIRouter()


@router.get("/api/documents")
async def list_documents(query: str | None = Query(default=None)):
    return await storage.get_documents(query)


@router.get("/api/documents/{document_id}")
async def get_document(document_id: int):
    document = await storage.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.post("/api/documents", status_code=201)
async def upload_document(file: UploadFile = File(...)):
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="No file provided")

    document = await storage.create_document(
        InsertDocument(
            filename=file.filename or "upload",
            originalName=file.filename or "upload",
            mimeType=file.content_type or "application/octet-stream",
            size=len(payload),
            status="pending",
        )
    )

    await process_document(
        document.id,
        payload,
        file.content_type or "application/octet-stream",
    )
    updated = await storage.get_document(document.id)
    return updated or document


@router.delete("/api/documents/{document_id}", status_code=204)
async def delete_document(document_id: int):
    document = await storage.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    await storage.delete_document(document_id)
    return Response(status_code=204)


@router.post("/api/documents/{document_id}/tags", status_code=201)
async def create_tag(document_id: int, payload: CreateTagPayload):
    document = await storage.get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Tag name is required")
    return await storage.create_tag(
        InsertTag(
            documentId=document_id,
            name=payload.name.strip(),
            color=payload.color or "gray",
        )
    )


@router.delete("/api/tags/{tag_id}", status_code=204)
async def delete_tag(tag_id: int):
    await storage.delete_tag(tag_id)
    return Response(status_code=204)


@router.get("/api/analytics")
async def get_analytics():
    return await storage.get_stats()
