from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from python_app.pages import analytics, dashboard, document_detail, settings

# Lightweight FastAPI app that mirrors the React routes in client/src/pages.
app = FastAPI(title="NexusAI - Python")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

# Mount /static for logo and future assets; use absolute path for reliability.
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/", response_class=HTMLResponse)
@app.get("/documents", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    context = dashboard.get_dashboard_context()
    return templates.TemplateResponse("dashboard.html", {"request": request, **context})


@app.get("/documents/{doc_id}", response_class=HTMLResponse)
async def document_detail_page(request: Request, doc_id: int):
    context = document_detail.get_document_detail(doc_id)
    template = "document_detail.html" if context.get("document") else "not_found.html"
    return templates.TemplateResponse(template, {"request": request, **context})


@app.get("/analytics", response_class=HTMLResponse)
async def analytics_page(request: Request):
    context = analytics.get_analytics_context()
    return templates.TemplateResponse("analytics.html", {"request": request, **context})


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    context = settings.get_settings_context()
    return templates.TemplateResponse("settings.html", {"request": request, **context})


@app.exception_handler(404)
async def not_found(request: Request, exc):
    return templates.TemplateResponse(
        "not_found.html",
        {"request": request, "message": "Page not found"},
        status_code=404,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("python_app.main:app", host="127.0.0.1", port=8000, reload=True)
