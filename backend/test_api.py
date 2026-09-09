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

if __name__ == "__main__":
    test_health()
    test_ai_deep_dive()
    test_pdf_upload_and_annotations()
    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")
