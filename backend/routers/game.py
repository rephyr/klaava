from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import TournamentCreate, TournamentRead
from database import crud

router = APIRouter(tags=["game"])

@router.get("/game")
def getGameState(db: Session = Depends(getDb)):
    return {
        "phase": "lobby",
        "round": 0,
        "level": 1,
        "stake": 50,
    }

@router.post("/tournaments", response_model=TournamentRead)
def createTournament(data: TournamentCreate, db: Session = Depends(getDb)):
    return crud.createTournament(db, data)

@router.get("/tournaments/{tournamentId}", response_model=TournamentRead)
def getTournament(tournamentId: int, db: Session = Depends(getDb)):
    tournament = crud.getTournament(db, tournamentId)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament
