# Klaava

Tournament-style gambling game with RFID player cards and a live bracket display.

## Tech stack

**FastAPI**: Python backend framework. Async-ready and handles RFID events.

**Uvicorn**: ASGI server that runs FastAPI

**SQLAlchemy**: ORM for managing players, matches, and tournament state in the database without writing raw SQL.

**React**: Component-based UI library.

**Vite**: Frontend build tool. Fast dev server with instant hot module replacement.

**Tailwind CSS**: css framework


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
