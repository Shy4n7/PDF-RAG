<img width="1774" height="887" alt="ChatGPT Image Aug 20, 2026, 03_27_10 PM" src="https://github.com/user-attachments/assets/6e52ae59-b1c5-4f55-a728-8e2d4675757e" />

# AdroIT Technologies Chatbot Service

Production-ready RAG (Retrieval-Augmented Generation) backend service and embeddable chat widget for company landing pages. Built with FastAPI, LlamaIndex, FAISS, Google Gemini, and SlowAPI.

---

## Directory Structure

```text
├── core/
│   ├── config.py         # App configuration, constants, prompts
│   └── rag.py            # FAISS vector store, streaming pipeline, health checks
├── api/
│   └── routes.py         # FastAPI endpoints, rate limiting, and SSE streaming
├── widget/
│   ├── chat-widget.js    # Embeddable vanilla JS chat widget (SSE streaming + pills)
│   ├── chat-widget.css   # Widget styling & responsive pill buttons
│   ├── ChatWidget.jsx    # React component version (SSE streaming + pills)
│   └── demo.html         # Landing page integration demo
├── data/                 # PDF knowledge base documents
├── storage/              # Cached FAISS index and metadata
├── app.py                # Main FastAPI entry point and static mounter
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
└── README.md
```

---

## Setup & Running the Backend

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
CORS_ORIGINS=*
```

### 3. Start the Server
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation is accessible at `http://localhost:8000/docs`.

---

## Features & Enterprise Architecture

1. **Token Streaming (Server-Sent Events / SSE)**:
   - High-throughput response generation streamed token-by-token directly to the frontend.
   - Lowers perceived time-to-first-token to under 300ms.
2. **Interactive Starter Prompts (Pills)**:
   - Floating suggestion chips (*"What courses do you offer?"*, *"Tell me about placements"*, etc.) displayed on initial greeting.
   - Automatically collapses upon interaction.
3. **IP Rate Limiting**:
   - Built-in token-bucket rate limiting (15 requests per minute per IP address) powered by `slowapi` to protect API quotas.
4. **Health & Readiness Probes**:
   - `/api/health` validates index readiness and upstream dependencies for automated container orchestrator / load-balancer probes.

---

## Landing Page Integration

### Option 1: Script Embed (Any Website / HTML / WordPress)
Add the stylesheet to the `<head>` and the script before the closing `</body>` tag on your landing page:

```html
<link rel="stylesheet" href="http://localhost:8000/widget/chat-widget.css">

<script src="http://localhost:8000/widget/chat-widget.js" data-api-url="http://localhost:8000"></script>
```

### Option 2: React Component (React / Next.js / Vite)
Copy `widget/ChatWidget.jsx` into your components folder:

```jsx
import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <div className="landing-page">
      <ChatWidget apiUrl="http://localhost:8000" />
    </div>
  );
}
```

### Preview Demo
With the server running, visit `http://localhost:8000/widget/demo.html` in your browser to test the interactive widget embedded in a landing page.

---

## API Endpoints

### 1. Health & Readiness Probe
- **Endpoint:** `GET /api/health`
- **Response (HTTP 200 / 503):**
  ```json
  {
    "status": "healthy",
    "ready": true,
    "vector_store": "ready",
    "gemini_configured": true,
    "indexed_documents": 1
  }
  ```

### 2. Token Streaming Chat (Recommended)
- **Endpoint:** `POST /api/chat/stream`
- **Rate Limit:** 15 requests / minute / IP
- **Request Body:**
  ```json
  {
    "question": "What training programs are offered by AdroIT Technologies?"
  }
  ```
- **Response (`text/event-stream`):**
  ```text
  data: {"token": "AdroIT"}

  data: {"token": " Technologies"}

  data: {"token": " offers"}

  data: [DONE]
  ```

### 3. Synchronous Chat
- **Endpoint:** `POST /api/chat`
- **Rate Limit:** 15 requests / minute / IP
- **Request Body:**
  ```json
  {
    "question": "What training programs are offered by AdroIT Technologies?"
  }
  ```
- **Response:**
  ```json
  {
    "answer": "AdroIT Technologies offers training programs in Full Stack Development, Data Science, AI, Cloud Computing, and DevOps."
  }
  ```

---

## Updating the Knowledge Base

1. Place updated or new PDF files into the `data/` directory.
2. The service automatically detects changes in `data/` and rebuilds the FAISS vector index in `storage/` on the next server start or query.
