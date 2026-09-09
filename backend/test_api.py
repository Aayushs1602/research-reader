import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    print("[PASS] Health check")

def test_ai_deep_dive():
    payload = {
        "selected_text": "Transformer architecture with self-attention mechanism",
        "mode": "explain"
    }
    response = client.post("/api/ai/deep-dive", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "google_search_url" in data
    assert "explanation" in data
    assert len(data["suggested_followups"]) > 0
    print("[PASS] AI Deep Dive endpoint")

def test_pdf_upload_and_annotations():
    # Ensure user exists for test
    signup_res = client.post("/api/auth/signup", json={"email": "tester@test.com", "username": "Tester", "password": "password123"})
    if signup_res.status_code == 400:
        login_res = client.post("/api/auth/login", json={"email": "tester@test.com", "password": "password123"})
        token = login_res.json()["access_token"]
    else:
        token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Construct a minimal valid PDF byte sequence
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
        b"xref\n"
        b"0 4\n"
        b"0000000000 65535 f \n"
        b"0000000010 00000 n \n"
        b"0000000053 00000 n \n"
        b"0000000102 00000 n \n"
        b"trailer<</Size 4/Root 1 0 R>>\n"
        b"startxref\n"
        b"178\n"
        b"%%EOF\n"
    )

    pdf_file = io.BytesIO(minimal_pdf)
    files = {"file": ("attention_paper.pdf", pdf_file, "application/pdf")}
    upload_res = client.post("/api/documents/upload", files=files, headers=headers)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    doc_id = doc_data["id"]
    assert doc_data["original_name"] == "attention_paper.pdf"
    assert doc_data["page_count"] >= 1
    print(f"[PASS] Upload document (id: {doc_id})")

    # List documents
    list_res = client.get("/api/documents", headers=headers)
    assert list_res.status_code == 200
    assert any(d["id"] == doc_id for d in list_res.json())
    print("[PASS] List documents")

    # Create Annotation
    ann_payload = {
        "page_number": 1,
        "color": "#fef08a",
        "selected_text": "Transformer architecture with self-attention",
        "rects_json": '[{"x":0.1,"y":0.2,"width":0.6,"height":0.03}]',
        "comment_text": "Crucial model design detail"
    }
    ann_res = client.post(f"/api/documents/{doc_id}/annotations", json=ann_payload, headers=headers)
    assert ann_res.status_code == 201
    ann_data = ann_res.json()
    ann_id = ann_data["id"]
    assert ann_data["comment_text"] == "Crucial model design detail"
    print(f"[PASS] Create annotation (id: {ann_id})")

    # Fetch Annotations
    get_anns_res = client.get(f"/api/documents/{doc_id}/annotations", headers=headers)
    assert get_anns_res.status_code == 200
    assert len(get_anns_res.json()) >= 1
    print("[PASS] Fetch annotations")

    # Update Notes
    notes_payload = {
        "content": "# Key Takeaways\n- Self-attention replaces recurrence.\n- Trained on 8 GPUs."
    }
    put_notes_res = client.put(f"/api/documents/{doc_id}/notes", json=notes_payload, headers=headers)
    assert put_notes_res.status_code == 200
    assert put_notes_res.json()["content"] == notes_payload["content"]
    print("[PASS] Update markdown notes")

    # Update Progress
    prog_res = client.patch(f"/api/documents/{doc_id}/progress", json={"last_page": 1, "progress_percent": 100.0}, headers=headers)
    assert prog_res.status_code == 200
    assert prog_res.json()["progress_percent"] == 100.0
    print("[PASS] Update reading progress")

    # Cleanup annotation
    del_ann_res = client.delete(f"/api/annotations/{ann_id}", headers=headers)
    assert del_ann_res.status_code == 204
    print("[PASS] Delete annotation")

def test_admin_and_rag():
    from app.database.models import User, DocumentChunk
    from app.database.session import SessionLocal

    # Login as test user
    login_res = client.post("/api/auth/login", json={"email": "tester@test.com", "password": "password123"})
    if login_res.status_code != 200:
        signup_res = client.post("/api/auth/signup", json={"email": "tester@test.com", "username": "Tester", "password": "password123"})
        token = signup_res.json()["access_token"]
        user_id = signup_res.json()["user"]["id"]
    else:
        token = login_res.json()["access_token"]
        user_id = login_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure tester is initially non-admin to verify 403 Forbidden
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == user_id).first()
        u.is_admin = False
        db.commit()
    finally:
        db.close()

    # Verify regular user cannot access admin health
    forbidden_res = client.get("/api/admin/health", headers=headers)
    assert forbidden_res.status_code == 403
    print("[PASS] Security: Non-admin access to /api/admin/health blocked with 403 Forbidden")

    # Now promote tester to admin
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == user_id).first()
        u.is_admin = True
        db.commit()
    finally:
        db.close()

    # 1. Admin Health
    health_res = client.get("/api/admin/health", headers=headers)
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert "users" in data["table_counts"]
    assert "document_chunks" in data["table_counts"]
    print(f"[PASS] Admin Health check (latency: {data['latency_ms']}ms, dialect: {data['database_info']['dialect']})")

    # 2. Table Explorer
    table_res = client.get("/api/admin/tables/users", headers=headers)
    assert table_res.status_code == 200
    assert len(table_res.json()["rows"]) >= 1
    print("[PASS] Admin Table Explorer (users table)")

    # 3. RAG Documents
    rag_docs_res = client.get("/api/admin/rag/documents", headers=headers)
    assert rag_docs_res.status_code == 200
    docs = rag_docs_res.json()
    assert len(docs) >= 1
    doc_id = docs[0]["id"]
    print(f"[PASS] Admin RAG documents list ({len(docs)} documents)")

    # 4. User-Level Document Chunking endpoint
    user_chunk_res = client.post(f"/api/documents/{doc_id}/chunk?target_words=100&overlap_words=20", headers=headers)
    assert user_chunk_res.status_code == 200
    print(f"[PASS] User-Level Document Chunking endpoint (/api/documents/{doc_id}/chunk)")

    # Seed a test chunk if document was mock/text-less
    db = SessionLocal()
    try:
        sample_chunk = DocumentChunk(
            document_id=doc_id,
            chunk_index=0,
            page_number=1,
            content="Attention mechanisms and transformer neural networks enable sequence-to-sequence modeling.",
            token_count=14,
        )
        db.add(sample_chunk)
        db.commit()
    finally:
        db.close()

    # 5. User-Level Fetch Document Chunks
    user_chunks_res = client.get(f"/api/documents/{doc_id}/chunks", headers=headers)
    assert user_chunks_res.status_code == 200
    chunks = user_chunks_res.json()
    assert len(chunks) >= 1
    assert "content" in chunks[0]
    print(f"[PASS] User-Level Document chunks retrieval ({len(chunks)} chunks retrieved)")

    # 6. User-Level Document RAG Search
    user_search_res = client.post(f"/api/documents/{doc_id}/rag-search", json={"query": "attention neural networks"}, headers=headers)
    assert user_search_res.status_code == 200
    search_data = user_search_res.json()
    assert len(search_data["results"]) >= 1
    print(f"[PASS] User-Level Document RAG search (top matches: {len(search_data['results'])})")

if __name__ == "__main__":
    test_health()
    test_ai_deep_dive()
    test_pdf_upload_and_annotations()
    test_admin_and_rag()
    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")
