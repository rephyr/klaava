# Klaava

Tournament-style gambling game with a live display screen, horse racing, blackjack, roulette, hi-lo, and an auction, which is controlled from an admin panel in real time.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy · SQLite |
| Frontend | React 18 · Vite · Tailwind CSS |
| Infrastructure | Docker · Nginx · GitHub Actions |

## Running with Docker

The easiest way to run the project. Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

```bash
git clone https://github.com/rephyr/klaava.git
cd klaava
docker-compose up --build
```

| URL | Description |
|---|---|
| `http://localhost:3000/admin/` | Admin panel -> control the game |
| `http://localhost:3000/display` | Display screen -> shown to players |

The database is stored in a Docker volume and persists across restarts. To reset it:

```bash
docker-compose down -v
```

## Running locally (development)

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

## Tests

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend
cd frontend && npx vitest run src/tests/
```
