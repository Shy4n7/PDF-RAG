import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import CORS_ORIGINS
from api.routes import router as api_router

app = FastAPI(
    title="AdroIT Chatbot API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

widget_dir = os.path.join(os.path.dirname(__file__), "widget")
if os.path.exists(widget_dir):
    app.mount("/widget", StaticFiles(directory=widget_dir, html=True), name="widget")
