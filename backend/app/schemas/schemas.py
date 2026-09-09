from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Document Schemas ---
class DocumentBase(BaseModel):
    original_name: str
    file_size: int
    page_count: int

class DocumentProgressUpdate(BaseModel):
    last_page: int = Field(ge=1)
    progress_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)

class DocumentResponse(BaseModel):
    id: str
    original_name: str
    file_size: int
    page_count: int
    last_page: int
    progress_percent: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Annotation Schemas ---
class AnnotationCreate(BaseModel):
    page_number: int = Field(ge=1)
    color: str = "#fef08a"
    selected_text: str
    rects_json: str  # JSON-encoded array of {x, y, width, height}
    comment_text: Optional[str] = None

class AnnotationUpdate(BaseModel):
    color: Optional[str] = None
    comment_text: Optional[str] = None

class AnnotationResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    color: str
    selected_text: str
    rects_json: str
    comment_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Note Schemas ---
class DocumentNoteUpdate(BaseModel):
    content: str

class DocumentNoteResponse(BaseModel):
    id: str
    document_id: str
    content: str
    updated_at: datetime

    class Config:
        from_attributes = True

# --- AI & Deep Dive Schemas ---
class AIDeepDiveRequest(BaseModel):
    selected_text: str
    context: Optional[str] = None
    mode: str = "explain"  # "explain", "summarize", "search_queries", "critique"

class AIDeepDiveResponse(BaseModel):
    query: str
    explanation: str
    google_search_url: str
    suggested_followups: List[str] = []
