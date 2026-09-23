from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from core.rag import ask_rag

router = APIRouter()

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

class ChatResponse(BaseModel):
    answer: str

class HealthResponse(BaseModel):
    status: str

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="healthy")

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
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
