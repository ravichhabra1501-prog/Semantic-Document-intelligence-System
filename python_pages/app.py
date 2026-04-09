from pathlib import Path
from flask import Flask, render_template, abort


BASE_DIR = Path(__file__).resolve().parent

# Serve the existing public assets (including the logo) as Flask static files.
STATIC_DIR = BASE_DIR.parent / "client" / "public"

app = Flask(
    __name__,
    static_folder=str(STATIC_DIR),
    template_folder=str(BASE_DIR / "templates"),
)


# --- Mock data -----------------------------------------------------------------
DOCUMENTS = [
    {
        "id": "doc-1",
        "title": "Quarterly Strategy Brief",
        "summary": "High-level overview of Q2 goals, risks, and mitigation steps.",
        "tags": ["strategy", "planning", "q2"],
        "status": "In review",
    },
    {
        "id": "doc-2",
        "title": "AI Governance Policy",
        "summary": "Guidelines for responsible AI usage across teams and products.",
        "tags": ["policy", "ai", "compliance"],
        "status": "Published",
    },
    {
        "id": "doc-3",
        "title": "Customer Insights Deck",
        "summary": "Key learnings from the latest customer interviews and surveys.",
        "tags": ["research", "customers", "slides"],
        "status": "Draft",
    },
]

ANALYTICS = {
    "documents_indexed": 128,
    "active_users": 42,
    "avg_response_ms": 320,
    "accuracy": 0.93,
    "trend": [10, 18, 26, 29, 33, 42, 55, 64],
}


# --- Routes --------------------------------------------------------------------
@app.route("/")
@app.route("/documents")
def dashboard():
    return render_template("dashboard.html", documents=DOCUMENTS)


@app.route("/documents/<doc_id>")
def document_detail(doc_id: str):
    doc = next((d for d in DOCUMENTS if d["id"] == doc_id), None)
    if not doc:
        abort(404)
    return render_template("document_detail.html", document=doc)


@app.route("/analytics")
def analytics():
    return render_template("analytics.html", stats=ANALYTICS)


@app.route("/settings")
def settings():
    return render_template("settings.html")


@app.errorhandler(404)
def not_found(_):
    return render_template("not_found.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
