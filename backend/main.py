from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine
from database.models import Base
from routers import players, loans, game, settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Klaava")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(loans.router)
app.include_router(game.router)
app.include_router(settings.router)

@app.get("/")
def helloWorld():
    return {"message": "Hello world!"}
