import re
import json
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.database.models import Document, DocumentChunk
from app.core.config import STORAGE_DIR

def clean_text(text: str) -> str:
    """Normalize whitespace and line-breaks."""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def split_text_into_chunks(
    text: str,
    page_number: int = 1,
    target_words: int = 150,
    overlap_words: int = 30,
) -> List[Dict[str, Any]]:
    """
    Splits text into overlapping chunks respecting sentence/word boundaries.
    """
    words = text.split()
    if not words:
        return []

    chunks = []
    step = max(1, target_words - overlap_words)

    for i in range(0, len(words), step):
        chunk_words = words[i:i + target_words]
        chunk_text = " ".join(chunk_words)
        if len(chunk_text) < 15 and i > 0:
            # Skip tiny trailing fragments
            continue

        token_est = int(len(chunk_words) * 1.3)
        chunks.append({
            "page_number": page_number,
            "content": chunk_text,
            "token_count": token_est,
            "metadata": {
                "word_count": len(chunk_words),
                "start_word_index": i,
                "strategy": "sliding_window",
            }
        })

        if i + target_words >= len(words):
            break

    return chunks

def chunk_document(
    db: Session,
    document: Document,
    target_words: int = 150,
    overlap_words: int = 30,
) -> Dict[str, Any]:
    """
    Extracts text from PDF, partitions into structured chunks, and stores in document_chunks table.
    """
    file_path = STORAGE_DIR / document.filename
    if not file_path.exists():
        raise FileNotFoundError(f"PDF file {document.filename} not found in storage.")

    try:
        reader = PdfReader(str(file_path))
        num_pages = len(reader.pages)
    except Exception:
        reader = None
        num_pages = 0

    # Clean existing chunks for this document
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    db.flush()

    all_chunks: List[Dict[str, Any]] = []

    if reader:
        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            try:
                raw_text = page.extract_text() or ""
            except Exception:
                raw_text = ""
            cleaned = clean_text(raw_text)
            if not cleaned:
                continue

            page_chunks = split_text_into_chunks(
                cleaned,
                page_number=page_num,
                target_words=target_words,
                overlap_words=overlap_words,
            )
            all_chunks.extend(page_chunks)

    # Save to database
    chunk_objects = []
    for idx, c in enumerate(all_chunks):
        chunk_obj = DocumentChunk(
            document_id=document.id,
            chunk_index=idx,
            page_number=c["page_number"],
            content=c["content"],
            token_count=c["token_count"],
            metadata_json=json.dumps(c["metadata"]),
            embedding_json=None,
        )
        chunk_objects.append(chunk_obj)
        db.add(chunk_obj)

    db.commit()

    total_tokens = sum(c["token_count"] for c in all_chunks)

    return {
        "document_id": document.id,
        "document_name": document.original_name,
        "pages_processed": num_pages,
        "chunks_generated": len(chunk_objects),
        "total_tokens_estimated": total_tokens,
    }
