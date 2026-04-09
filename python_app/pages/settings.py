def get_settings_context():
    """Return user preference defaults for the settings view."""
    return {
        "theme": "system",
        "compact_view": False,
        "notifications": True,
        "ai_model": "gpt-4o",
        "text_limit": "10,000 chars",
        "supported_types": [".PDF", ".DOCX", ".TXT", ".JPG", ".PNG"],
        "workspace_stats": {
            "totalDocuments": 41,
            "totalEntities": 132,
            "totalTags": 24,
        },
    }
