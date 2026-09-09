import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
# Load .env from backend/ or project root
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = STORAGE_DIR / "reader.db"
_raw_db_url = os.getenv("DATABASE_URL")
if not _raw_db_url:
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
elif _raw_db_url.startswith("postgres://"):
    # SQLAlchemy 2.0 requires postgresql:// instead of postgres://
    DATABASE_URL = _raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = _raw_db_url

# Security & JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "research-reader-secret-key-super-secure-change-in-prod-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Admin authorization
_raw_admin_emails = os.getenv("ADMIN_EMAILS", "")
ADMIN_EMAILS = {e.strip().lower() for e in _raw_admin_emails.split(",") if e.strip()}

CORS_ORIGINS = [
    "https://research-reader-psi.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
