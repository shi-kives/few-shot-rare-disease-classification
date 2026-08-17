import logging
import pickle
from pathlib import Path
from contextlib import asynccontextmanager
 
import torch
import chromadb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
 
from api.utils import load_model
from api.routes import diagnose, feedback, add_class
 
logger = logging.getLogger("uvicorn")
 
# ---------------------------------------------------------------------
# Configuration — adjust these to match your actual project layout
# ---------------------------------------------------------------------
MODEL_PATH = "models/best_model_resnet18.pth" if Path("models/best_model_resnet18.pth").exists() else "models/best_model.pth"
FISHER_PATH = "models/fisher_diagonal.pth"
ANCHOR_PATH = "models/anchor_weights.pth"
REPLAY_BUFFER_PATH = "data/replay_buffer.pkl"
CHROMA_PERSIST_DIR = "data/chroma_db"
 
MODEL_CONFIG = {
    "backbone": "resnet18",
    "embedding_dim": 128,
}
 
FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
 
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
 
    # 1. Load the trained embedding model
    try:
        model = load_model(MODEL_PATH, MODEL_CONFIG, device)
        model_loaded = True
    except Exception as e:
        logger.error(f"Failed to load model from {MODEL_PATH}: {e}")
        model = None
        model_loaded = False
 
    # 2. Load EWC regularization tensors (Fisher diagonal + anchor weights)
    fisher, anchor_weights, ewc_loaded = None, None, False
    try:
        fisher = torch.load(FISHER_PATH, map_location=device)
        anchor_weights = torch.load(ANCHOR_PATH, map_location=device)
        ewc_loaded = True
        logger.info("EWC Fisher diagonal and anchor weights loaded")
    except Exception as e:
        logger.warning(f"EWC assets not loaded — fine-tuning via /add_class will be unavailable: {e}")
 
    # 3. Connect to ChromaDB
    chroma_client, prototypes_collection, support_images_collection = None, None, None
    chroma_connected = False
    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        prototypes_collection = chroma_client.get_or_create_collection("prototypes")
        support_images_collection = chroma_client.get_or_create_collection("support_images")
        chroma_connected = True
        logger.info(f"Connected to ChromaDB at {CHROMA_PERSIST_DIR}")
    except Exception as e:
        logger.error(f"Failed to connect to ChromaDB: {e}")
 
    # 4. Load the replay buffer (used for EWC rehearsal during fine-tuning)
    replay_buffer = []
    try:
        buffer_path = Path(REPLAY_BUFFER_PATH)
        if buffer_path.exists():
            with open(buffer_path, "rb") as f:
                replay_buffer = pickle.load(f)
            logger.info(f"Replay buffer loaded ({len(replay_buffer)} samples)")
        else:
            logger.warning(f"No replay buffer found at {REPLAY_BUFFER_PATH} — starting empty")
    except Exception as e:
        logger.warning(f"Could not load replay buffer, starting empty: {e}")
 
    # Store everything on app.state so route handlers can access it
    app.state.device = device
    app.state.model = model
    app.state.model_loaded = model_loaded
    app.state.model_config = MODEL_CONFIG
    app.state.fisher = fisher
    app.state.anchor_weights = anchor_weights
    app.state.ewc_loaded = ewc_loaded
    app.state.chroma_client = chroma_client
    app.state.prototypes_collection = prototypes_collection
    app.state.support_images_collection = support_images_collection
    app.state.chroma_connected = chroma_connected
    app.state.replay_buffer = replay_buffer
    app.state.replay_buffer_path = REPLAY_BUFFER_PATH
 
    yield  # ---- app serves requests here ----
 
    logger.info("Shutting down")
 
 
app = FastAPI(title="Diagnosis Assistant API", lifespan=lifespan)
 
#app.add_middleware(
    #CORSMiddleware,
    #allow_origins=FRONTEND_ORIGINS,
    #allow_credentials=True,
    #allow_methods=["*"],
    #allow_headers=["*"],
#)
#from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
from fastapi.staticfiles import StaticFiles

# Ensure static support images directory exists
static_dir = Path("data/processed/support_images")
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

app.include_router(diagnose.router)
app.include_router(feedback.router)
app.include_router(add_class.router)


@app.get("/health")
async def health():
    """Reports model load status and ChromaDB collection counts."""
    collections = {}
    chroma_connected = getattr(app.state, "chroma_connected", False)
    model_loaded = getattr(app.state, "model_loaded", False)
    ewc_loaded = getattr(app.state, "ewc_loaded", False)
    replay_buffer = getattr(app.state, "replay_buffer", [])
    device = getattr(app.state, "device", "cpu")

    if chroma_connected:
        try:
            proto_col = getattr(app.state, "prototypes_collection", None)
            support_col = getattr(app.state, "support_images_collection", None)
            if proto_col:
                collections["prototypes"] = proto_col.count()
            if support_col:
                collections["support_images"] = support_col.count()
        except Exception as e:
            collections["error"] = str(e)

    return {
        "status": "ok" if (model_loaded and chroma_connected) else "degraded",
        "model_loaded": model_loaded,
        "backbone": "ResNet18 / EfficientNet-B3",
        "ewc_loaded": ewc_loaded,
        "chroma_connected": chroma_connected,
        "chroma_collections": collections,
        "replay_buffer_size": len(replay_buffer),
        "device": str(device),
    }
 