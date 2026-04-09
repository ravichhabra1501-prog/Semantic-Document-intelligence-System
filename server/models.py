from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


DocumentStatus = Literal["pending", "processing", "completed", "failed"]


class Entity(BaseModel):
    id: int
    documentId: int
    entityType: str
    value: str


class Tag(BaseModel):
    id: int
    documentId: int
    name: str
    color: str = "gray"
    createdAt: str


class Document(BaseModel):
    id: int
    filename: str
    originalName: str
    mimeType: str
    size: int
    content: Optional[str] = None
    summary: Optional[str] = None
    classification: Optional[str] = None
    workflow: Optional[str] = None
    diagram: Optional[str] = None
    status: DocumentStatus = "pending"
    error: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class DocumentListItem(Document):
    tags: list[Tag] = Field(default_factory=list)


class DocumentDetail(Document):
    entities: list[Entity] = Field(default_factory=list)
    tags: list[Tag] = Field(default_factory=list)


class InsertDocument(BaseModel):
    filename: str
    originalName: str
    mimeType: str
    size: int
    content: Optional[str] = None
    summary: Optional[str] = None
    classification: Optional[str] = None
    workflow: Optional[str] = None
    diagram: Optional[str] = None
    status: DocumentStatus = "pending"
    error: Optional[str] = None


class UpdateDocument(BaseModel):
    filename: Optional[str] = None
    originalName: Optional[str] = None
    mimeType: Optional[str] = None
    size: Optional[int] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    classification: Optional[str] = None
    workflow: Optional[str] = None
    diagram: Optional[str] = None
    status: Optional[DocumentStatus] = None
    error: Optional[str] = None


class InsertEntity(BaseModel):
    documentId: int
    entityType: str
    value: str


class InsertTag(BaseModel):
    documentId: int
    name: str
    color: str = "gray"


class CreateTagPayload(BaseModel):
    name: str
    color: str = "gray"


class StatusBucket(BaseModel):
    status: str
    count: int


class TypeBucket(BaseModel):
    type: str
    count: int


class ClassificationBucket(BaseModel):
    classification: str
    count: int


class EntityTypeBucket(BaseModel):
    entityType: str
    count: int


class RecentUploadBucket(BaseModel):
    date: str
    count: int


class AnalyticsStats(BaseModel):
    totalDocuments: int
    byStatus: list[StatusBucket]
    byType: list[TypeBucket]
    byClassification: list[ClassificationBucket]
    byEntityType: list[EntityTypeBucket]
    recentUploads: list[RecentUploadBucket]
    totalEntities: int
    totalTags: int


class WorkflowData(BaseModel):
    title: str
    steps: list[str]
    diagram: str
