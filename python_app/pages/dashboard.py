from datetime import datetime


def get_dashboard_context():
    """Return data required by the dashboard view."""
    return {
        "title": "NexusAI",
        "subtitle": "Manage and semantically search your knowledge base with AI.",
        "search_placeholder": "Search documents...",
        "documents": [
            {
                "id": 1,
                "name": "Quarterly Report.pdf",
                "classification": "Finance",
                "status": "completed",
                "uploaded_at": datetime(2026, 3, 1, 10, 30),
                "size_kb": 820.5,
            },
            {
                "id": 2,
                "name": "Contract.docx",
                "classification": "Legal",
                "status": "processing",
                "uploaded_at": datetime(2026, 3, 14, 9, 5),
                "size_kb": 210.2,
            },
        ],
    }
