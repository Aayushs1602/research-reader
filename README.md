# 📚 Research Reader

A modern, full-stack research paper reading and annotation platform built for deep academic reading, note-taking, and synthesis.

![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20Tailwind-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20SQLite-green)
![PDF Engine](https://img.shields.io/badge/PDF%20Engine-Mozilla%20PDF.js-red)

---

## ✨ Features

- **⚡ Multi-Color Semantic Highlighting**: Select any text on any page and highlight in 6 colors (Yellow, Green, Blue, Purple, Pink, Orange) with resolution-independent coordinate tracking.
- **💬 Inline Floating Comments & Sticky Notes**: Attach notes and critiques to any highlighted phrase.
- **📝 Bi-Directional Split-Screen Notepad**:
  - Read the PDF on the left, take notes in Markdown on the right.
  - Clicking any highlight or comment in the sidebar smoothly scrolls the PDF viewer directly to the exact page and highlight with a pulsating focus animation.
  - Clicking a highlight directly on the PDF focuses that note in the sidebar.
- **🔍 1-Click Google Search & AI Deep Dive (USP)**:
  - Select any complex equation, paragraph, or term to instantly search on Google or trigger an AI concept breakdown with suggested research questions.
  - One-click appends AI insights directly into your Markdown notes.
- **📑 Outline & Table of Contents**: Automatically parses native PDF bookmarks for rapid chapter navigation.
- **🔎 Full-Text In-Document Search**: High-performance search across all pages with active match navigation (`Enter` / `Shift+Enter`).
- **🌙 Reading Ergonomics**:
  - **Light Mode**: Standard crisp view.
  - **Sepia / Warm Paper Mode**: Soft amber tone reduces eye strain during long reading sessions.
  - **Dark Mode**: High-contrast dark reader for night study.
- **📤 Export Integration**: Export notes and extracted highlights directly to Markdown (100% compatible with Obsidian, Notion, and Logseq).
- **📊 Reading Progress**: Automatically tracks last read page and completion percentage per paper.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

### 1. Start Backend (FastAPI)
```bash
cd backend
# Activate virtual environment (if using venv)
..\venv\Scripts\activate
# Start server
python run.py
```
*Backend runs at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.*

### 2. Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## 🌐 Free Hosting Guide

### Deploying Frontend (Vercel / Netlify - 100% Free)
1. Push this repository to GitHub.
2. Go to **[Vercel](https://vercel.com)** or **[Netlify](https://netlify.com)** and click **Add New Project**.
3. Set the Root Directory to `frontend`.
4. Framework Preset: **Vite**.
5. Add Environment Variable:
   - `VITE_API_URL`: URL of your deployed FastAPI backend (e.g. `https://your-backend.onrender.com`).
6. Click **Deploy**. Your frontend is live with SSL and CDN!

### Deploying Backend (Render / Railway - Free Tier)
1. Go to **[Render](https://render.com)** and create a **New Web Service**.
2. Connect your GitHub repository and set Root Directory to `backend`.
3. Runtime: **Python 3**.
4. Build Command: `pip install -r requirements.txt`.
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`.
6. Add a persistent disk if you want uploaded PDFs to persist beyond server reboots, or connect to Supabase/S3 for cloud file storage.

---

## 🧠 Enabling Real AI Models (Gemini / OpenAI)

The AI deep dive endpoint is located in `backend/app/api/ai.py`.
To connect Google Gemini or OpenAI:
1. Set `GEMINI_API_KEY` or `OPENAI_API_KEY` in your environment.
2. The endpoint will automatically stream real model inferences directly into the Deep Dive panel!
