import os
import faiss
from dotenv import load_dotenv
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.faiss import FaissVectorStore
from llama_index.llms.gemini import Gemini

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    api_key = input("Enter your Gemini API key: ").strip()

Settings.embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
Settings.llm = Gemini(model="models/gemini-3.1-flash-lite", api_key=api_key)
Settings.chunk_size = 512
Settings.chunk_overlap = 50

print("Loading PDF document from data/...")
documents = SimpleDirectoryReader("./data").load_data()

print("Initializing FAISS Vector Store...")
d = 384
faiss_index = faiss.IndexFlatL2(d)
vector_store = FaissVectorStore(faiss_index=faiss_index)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

print("Building vector index and embedding chunks...")
index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
query_engine = index.as_query_engine(similarity_top_k=3)

print("\n=== Chatbot Ready! (Ask questions about AdroIT Technologies) ===")
print("Type 'exit' to quit.\n")

while True:
    try:
        user_query = input("You: ").strip()
        if not user_query:
            continue
        if user_query.lower() in ["exit", "quit"]:
            print("Goodbye!")
            break
            
        print("Thinking...")
        response = query_engine.query(user_query)
        print(f"\nChatBot: {response.response}\n")
        print("-" * 50)
        
    except EOFError:
        print("\nGoodbye!")
        break
    except KeyboardInterrupt:
        print("\nGoodbye!")
        break
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "quota" in err_msg.lower() or "limit exceeded" in err_msg.lower():
            print("\nRate limit reached. Please wait 15-30 seconds before asking again.\n")
        else:
            print(f"\nError: {e}\n")
