import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pypdf

from app.database.session import get_db
from app.database.models import Document, DocumentNote, User
from app.schemas.schemas import DocumentResponse, DocumentProgressUpdate
from app.core.config import STORAGE_DIR
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}.pdf"
    file_path = STORAGE_DIR / stored_filename

    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    file_size = os.path.getsize(file_path)

    # Read page count using pypdf
    page_count = 1
    try:
        reader = pypdf.PdfReader(str(file_path))
        page_count = len(reader.pages)
    except Exception:
        page_count = 1

    # Create document record in database linked to authenticated user
    doc = Document(
        id=file_id,
        user_id=current_user.id,
        filename=stored_filename,
        original_name=file.filename,
        file_size=file_size,
        page_count=max(1, page_count),
        last_page=1,
        progress_percent=round((1 / max(1, page_count)) * 100, 1),
    )
    db.add(doc)

    # Initialize empty Markdown note for this document
    note = DocumentNote(
        document_id=file_id,
        content=f"# Notes for {file.filename}\n\nStart typing your research notes, summaries, and key takeaways here...",
    )
    db.add(note)

    db.commit()
    db.refresh(doc)
    return doc

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only return documents belonging to current user
    return (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.updated_at.desc())
        .all()
    )

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{doc_id}/file")
def get_document_file(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = STORAGE_DIR / doc.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File on disk not found")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=doc.original_name,
    )

@router.patch("/{doc_id}/progress", response_model=DocumentResponse)
def update_progress(
    doc_id: str,
    payload: DocumentProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.last_page = payload.last_page
    if payload.progress_percent is not None:
        doc.progress_percent = payload.progress_percent
    else:
        doc.progress_percent = round((payload.last_page / max(1, doc.page_count)) * 100, 1)

    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = STORAGE_DIR / doc.filename
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return None
