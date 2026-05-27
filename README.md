# Klaava

Tournament-style drinking game with RFID player cards, a receipt printer, and a live bracket display.

## Tech stack

**FastAPI** — Python backend framework. Async-ready and handles RFID events and printer commands well. Generates API docs automatically.

**Uvicorn** — ASGI server that runs FastAPI. Lightweight and supports hot-reload during development.

**SQLAlchemy** — ORM for managing players, matches, and tournament state in the database without writing raw SQL.

**React** — Component-based UI library. Makes the live bracket easy to build, update, and re-render as match results come in.

**Vite** — Frontend build tool. Fast dev server with instant hot module replacement.

**Tailwind CSS** — Utility-first CSS framework. Quick to style the bracket display and game UI without writing custom stylesheets.

## Monorepo structure

```
klaava/
├── backend/     # Python FastAPI
└── frontend/    # React + Vite + Tailwind CSS
```

## Running the project

Both backend and frontend need to run at the same time in separate terminals.

**Terminal 1 — backend** (`http://localhost:8000`)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2 — frontend** (`http://localhost:5173`)
```bash
cd frontend
npm install
npm run dev
```
