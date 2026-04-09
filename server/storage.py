from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta
from threading import RLock

from .models import (
    AnalyticsStats,
    ClassificationBucket,
    Document,
    DocumentDetail,
    DocumentListItem,
    Entity,
    EntityTypeBucket,
    InsertDocument,
    InsertEntity,
    InsertTag,
    RecentUploadBucket,
    StatusBucket,
    Tag,
    TypeBucket,
    UpdateDocument,
)


def now_iso() -> str:
    return datetime.utcnow().isoformat()


class InMemoryStorage:
    def __init__(self) -> None:
        self._documents: list[Document] = []
        self._entities: list[Entity] = []
        self._tags: list[Tag] = []
        self._next_document_id = 1
        self._next_entity_id = 1
        self._next_tag_id = 1
        self._lock = RLock()

    def _clone(self, value):
        return deepcopy(value)

    def _apply_query_filter(
        self, documents: list[Document], query: str | None = None
    ) -> list[Document]:
        if not query:
            return documents

        lower = query.lower()
        return [
            doc
            for doc in documents
            if lower in doc.filename.lower()
            or lower in (doc.summary or "").lower()
            or lower in (doc.content or "").lower()
            or lower in (doc.classification or "").lower()
        ]

    async def get_documents(self, query: str | None = None) -> list[DocumentListItem]:
        with self._lock:
            docs = sorted(self._documents, key=lambda item: item.createdAt)
            docs = self._apply_query_filter(docs, query)
            items = [
                DocumentListItem(
                    **doc.model_dump(),
                    tags=[
                        tag.model_copy(deep=True)
                        for tag in self._tags
                        if tag.documentId == doc.id
                    ],
                )
                for doc in docs
            ]
            return self._clone(items)

    async def get_document(self, document_id: int) -> DocumentDetail | None:
        with self._lock:
            doc = next((item for item in self._documents if item.id == document_id), None)
            if not doc:
                return None
            detail = DocumentDetail(
                **doc.model_dump(),
                entities=[
                    entity.model_copy(deep=True)
                    for entity in self._entities
                    if entity.documentId == document_id
                ],
                tags=[
                    tag.model_copy(deep=True)
                    for tag in self._tags
                    if tag.documentId == document_id
                ],
            )
            return self._clone(detail)

    async def create_document(self, payload: InsertDocument) -> Document:
        with self._lock:
            document = Document(
                id=self._next_document_id,
                createdAt=now_iso(),
                **payload.model_dump(),
            )
            self._next_document_id += 1
            self._documents.append(document)
            return self._clone(document)

    async def update_document(self, document_id: int, updates: UpdateDocument) -> Document:
        with self._lock:
            for index, existing in enumerate(self._documents):
                if existing.id != document_id:
                    continue
                merged = existing.model_copy(
                    update=updates.model_dump(exclude_unset=True)
                )
                self._documents[index] = merged
                return self._clone(merged)
        raise ValueError("Document not found")

    async def delete_document(self, document_id: int) -> None:
        with self._lock:
            self._documents = [
                item for item in self._documents if item.id != document_id
            ]
            self._entities = [
                item for item in self._entities if item.documentId != document_id
            ]
            self._tags = [item for item in self._tags if item.documentId != document_id]

    async def create_entity(self, payload: InsertEntity) -> Entity:
        with self._lock:
            entity = Entity(id=self._next_entity_id, **payload.model_dump())
            self._next_entity_id += 1
            self._entities.append(entity)
            return self._clone(entity)

    async def get_entities_for_document(self, document_id: int) -> list[Entity]:
        with self._lock:
            return self._clone(
                [item for item in self._entities if item.documentId == document_id]
            )

    async def create_tag(self, payload: InsertTag) -> Tag:
        with self._lock:
            tag = Tag(
                id=self._next_tag_id,
                createdAt=now_iso(),
                **payload.model_dump(),
            )
            self._next_tag_id += 1
            self._tags.append(tag)
            return self._clone(tag)

    async def delete_tag(self, tag_id: int) -> None:
        with self._lock:
            self._tags = [item for item in self._tags if item.id != tag_id]

    async def get_tags_for_document(self, document_id: int) -> list[Tag]:
        with self._lock:
            return self._clone(
                [item for item in self._tags if item.documentId == document_id]
            )

    async def get_stats(self) -> AnalyticsStats:
        with self._lock:
            all_docs = list(self._documents)
            all_entities = list(self._entities)
            all_tags = list(self._tags)

        status_map: dict[str, int] = {}
        type_map: dict[str, int] = {}
        class_map: dict[str, int] = {}
        entity_type_map: dict[str, int] = {}

        for doc in all_docs:
            status_map[doc.status] = status_map.get(doc.status, 0) + 1

            doc_type = "Other"
            if doc.mimeType == "application/pdf":
                doc_type = "PDF"
            elif (
                doc.mimeType
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ):
                doc_type = "DOCX"
            elif doc.mimeType == "text/plain":
                doc_type = "TXT"
            elif doc.mimeType.startswith("image/"):
                doc_type = "Image"
            type_map[doc_type] = type_map.get(doc_type, 0) + 1

            if doc.classification:
                class_map[doc.classification] = class_map.get(doc.classification, 0) + 1

        for entity in all_entities:
            entity_type_map[entity.entityType] = (
                entity_type_map.get(entity.entityType, 0) + 1
            )

        date_map: dict[str, int] = {}
        today = datetime.utcnow().date()
        for offset in range(13, -1, -1):
            current = (today - timedelta(days=offset)).isoformat()
            date_map[current] = 0

        for doc in all_docs:
            doc_date = doc.createdAt[:10]
            if doc_date in date_map:
                date_map[doc_date] += 1

        return AnalyticsStats(
            totalDocuments=len(all_docs),
            byStatus=[
                StatusBucket(status=status, count=count)
                for status, count in status_map.items()
            ],
            byType=[
                TypeBucket(type=doc_type, count=count)
                for doc_type, count in type_map.items()
            ],
            byClassification=[
                ClassificationBucket(classification=name, count=count)
                for name, count in sorted(
                    class_map.items(), key=lambda item: item[1], reverse=True
                )[:10]
            ],
            byEntityType=[
                EntityTypeBucket(entityType=name, count=count)
                for name, count in sorted(
                    entity_type_map.items(), key=lambda item: item[1], reverse=True
                )
            ],
            recentUploads=[
                RecentUploadBucket(date=date, count=count)
                for date, count in date_map.items()
            ],
            totalEntities=len(all_entities),
            totalTags=len(all_tags),
        )


storage = InMemoryStorage()
