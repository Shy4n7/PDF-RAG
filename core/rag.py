import os
import json
from typing import Generator
import faiss
from llama_index.core import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
    Settings,
    load_index_from_storage,
    PromptTemplate
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.faiss import FaissVectorStore
from llama_index.llms.gemini import Gemini

from core.config import (
    GEMINI_API_KEY,
    EMBEDDING_MODEL_NAME,
    LLM_MODEL_NAME,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    SIMILARITY_TOP_K,
    EMBEDDING_DIM,
    DATA_DIR,
    PERSIST_DIR,
    QA_PROMPT_TEMPLATE_STR
)

_query_engine = None

def init_settings():
    Settings.embed_model = HuggingFaceEmbedding(model_name=EMBEDDING_MODEL_NAME)
    Settings.llm = Gemini(model=LLM_MODEL_NAME, api_key=GEMINI_API_KEY)
    Settings.chunk_size = CHUNK_SIZE
    Settings.chunk_overlap = CHUNK_OVERLAP

def get_query_engine():
    global _query_engine
    if _query_engine is not None:
        return _query_engine

    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")

    init_settings()

    faiss_index = faiss.IndexFlatL2(EMBEDDING_DIM)
    vector_store = FaissVectorStore(faiss_index=faiss_index)

    rebuild_needed = True
    data_files = sorted(os.listdir(DATA_DIR)) if os.path.exists(DATA_DIR) else []
    metadata_path = os.path.join(PERSIST_DIR, "indexed_files.json")

    if os.path.exists(PERSIST_DIR) and os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                saved_files = json.load(f)
            if saved_files == data_files:
                rebuild_needed = False
        except Exception:
            rebuild_needed = True

    if rebuild_needed:
        documents = SimpleDirectoryReader(DATA_DIR).load_data()
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
        os.makedirs(PERSIST_DIR, exist_ok=True)
        index.storage_context.persist(persist_dir=PERSIST_DIR)
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(data_files, f)
    else:
        vector_store = FaissVectorStore.from_persist_dir(PERSIST_DIR)
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR, vector_store=vector_store)
        index = load_index_from_storage(storage_context)

    qa_template = PromptTemplate(QA_PROMPT_TEMPLATE_STR)
    _query_engine = index.as_query_engine(
        text_qa_template=qa_template,
        similarity_top_k=SIMILARITY_TOP_K,
        streaming=True
    )
    return _query_engine

def ask_rag(question: str) -> str:
    engine = get_query_engine()
    try:
        response = engine.query(question)
        if hasattr(response, "response_gen"):
            return "".join(response.response_gen).strip()
        return str(response.response).strip()
    except Exception as e:
        error_message = str(e)
        if "429" in error_message or "quota" in error_message.lower():
            raise RuntimeError("API quota or rate limit exceeded. Please try again shortly.") from e
        raise

def stream_rag(question: str) -> Generator[str, None, None]:
    engine = get_query_engine()
    try:
        response = engine.query(question)
        if hasattr(response, "response_gen"):
            for token in response.response_gen:
                yield f"data: {json.dumps({'token': token})}\n\n"
        else:
            text = str(response.response).strip()
            yield f"data: {json.dumps({'token': text})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        error_message = str(e)
        if "429" in error_message or "quota" in error_message.lower():
            yield f"data: {json.dumps({'error': 'Rate limit reached. Please wait a moment.'})}\n\n"
        else:
            yield f"data: {json.dumps({'error': error_message})}\n\n"
        yield "data: [DONE]\n\n"

def get_system_status() -> dict:
    is_gemini_set = bool(GEMINI_API_KEY)
    data_files = sorted(os.listdir(DATA_DIR)) if os.path.exists(DATA_DIR) else []
    metadata_path = os.path.join(PERSIST_DIR, "indexed_files.json")
    storage_exists = os.path.exists(PERSIST_DIR) and os.path.exists(metadata_path)
    engine_ready = _query_engine is not None

    return {
        "status": "healthy" if is_gemini_set else "unhealthy",
        "ready": is_gemini_set and (storage_exists or len(data_files) > 0),
        "vector_store": "ready" if (storage_exists or engine_ready) else "pending",
        "gemini_configured": is_gemini_set,
        "indexed_documents": len(data_files)
    }
