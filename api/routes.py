from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.rag import ask_rag, stream_rag, get_system_status

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

class ChatResponse(BaseModel):
    answer: str

class HealthResponse(BaseModel):
    status: str
    ready: bool
    vector_store: str
    gemini_configured: bool
    indexed_documents: int

@router.get("/health", response_model=HealthResponse)
def health_check(response: Response):
    info = get_system_status()
    if not info["ready"]:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthResponse(**info)

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("15/minute")
def chat_endpoint(request: Request, payload: ChatRequest):
    clean_question = payload.question.strip()
    if not clean_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty"
        )
    try:
        answer = ask_rag(clean_question)
        return ChatResponse(answer=answer)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating answer: {str(e)}"
        ) from e

@router.post("/chat/stream")
@limiter.limit("15/minute")
def chat_stream_endpoint(request: Request, payload: ChatRequest):
    clean_question = payload.question.strip()
    if not clean_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty"
        )
    try:
        return StreamingResponse(
            stream_rag(clean_question),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Streaming error: {str(e)}"
        ) from e
