from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import GameCreate, GameRead
from database import crud

router = APIRouter(prefix="/games", tags=["games"])

@router.get("/", response_model=list[GameRead])
def getGames(db: Session = Depends(getDb)):
    return crud.getGames(db)

@router.post("/", response_model=GameRead)
def createGame(data: GameCreate, db: Session = Depends(getDb)):
    return crud.createGame(db, data)

@router.delete("/{gameId}", response_model=GameRead)
def deleteGame(gameId: int, db: Session = Depends(getDb)):
    game = crud.deleteGame(db, gameId)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game

@router.put("/{gameId}/toggle", response_model=GameRead)
def toggleGame(gameId: int, db: Session = Depends(getDb)):
    game = crud.toggleGame(db, gameId)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game
