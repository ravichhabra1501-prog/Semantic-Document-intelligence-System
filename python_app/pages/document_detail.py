from datetime import datetime
from typing import Dict, Optional


def _demo_document(doc_id: int) -> Optional[Dict]:
    demo_docs = {
        1: {
            "id": 1,
            "originalName": "Quarterly Report.pdf",
            "status": "completed",
            "createdAt": datetime(2026, 3, 1, 10, 30),
            "size": 820_500,
            "mimeType": "application/pdf",
            "classification": "Finance",
            "summary": "Key highlights of the quarter with revenue growth and risk notes.",
            "content": "This is placeholder extracted text from the PDF document...",
            "entities": [
                {"entityType": "Company", "value": "Nexus AI"},
                {"entityType": "Quarter", "value": "Q1 2026"},
                {"entityType": "Currency", "value": "USD"},
            ],
            "tags": ["finance", "quarterly", "board"],
            "error": None,
        },
    }
    return demo_docs.get(doc_id)


def get_document_detail(doc_id: int):
    """Return detail context for a document; mimics React page behavior."""
    document = _demo_document(doc_id)
    grouped_entities = {}
    if document:
        for entity in document["entities"]:
            grouped_entities.setdefault(entity["entityType"], []).append(entity["value"])

    return {
        "document": document,
        "grouped_entities": grouped_entities,
    }
