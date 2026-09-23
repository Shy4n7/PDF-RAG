import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL_NAME = "models/gemini-3.1-flash-lite"
CHUNK_SIZE = 512
CHUNK_OVERLAP = 50
SIMILARITY_TOP_K = 3
EMBEDDING_DIM = 384

DATA_DIR = os.getenv("DATA_DIR", "./data")
PERSIST_DIR = os.getenv("PERSIST_DIR", "./storage")

QA_PROMPT_TEMPLATE_STR = (
    "You are a friendly AI assistant for AdroIT Technologies. "
    "Use the provided context to answer the query naturally. Keep your response brief (around 3 lines or 40 words) for simple queries, and go deeper only if the query is complex or explicitly asks for detail. "
    "Do not mention the word 'context', 'provided documents', 'RAG', or 'data' in your response. "
    "Do not introduce yourself or repeat your name (AdroBot) in your response. "
    "If the query cannot be answered using the provided context, politely state that you "
    "don't have information on that topic, list what you CAN help with (our courses, training programs, and company overview), "
    "and redirect them to email hr@adroittechnologies.in for assistance.\n\n"
    "Context:\n"
    "---------------------\n"
    "{context_str}\n"
    "---------------------\n"
    "Query: {query_str}\n"
    "Answer: "
)
