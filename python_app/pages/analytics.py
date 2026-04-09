from datetime import datetime, timedelta


def get_analytics_context():
    """Provide mock analytics data similar to the React analytics page."""
    today = datetime(2026, 3, 16)
    recent_uploads = [
        {"date": (today - timedelta(days=i)).strftime("%Y-%m-%d"), "count": (i % 5) + 1}
        for i in range(14)
    ][::-1]

    by_type = [
        {"type": "PDF", "count": 18},
        {"type": "DOCX", "count": 12},
        {"type": "TXT", "count": 6},
        {"type": "Image", "count": 5},
    ]

    return {
        "totalDocuments": 41,
        "totalEntities": 132,
        "totalTags": 24,
        "byStatus": [
            {"status": "completed", "count": 30},
            {"status": "processing", "count": 7},
            {"status": "pending", "count": 3},
            {"status": "failed", "count": 1},
        ],
        "byType": by_type,
        "byClassification": [
            {"classification": "Finance", "count": 12},
            {"classification": "Legal", "count": 9},
            {"classification": "Product", "count": 8},
            {"classification": "Marketing", "count": 7},
            {"classification": "Other", "count": 5},
        ],
        "byEntityType": [
            {"entityType": "Company", "count": 15},
            {"entityType": "Person", "count": 22},
            {"entityType": "Date", "count": 35},
            {"entityType": "Currency", "count": 18},
        ],
        "recentUploads": recent_uploads,
    }
