from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import TournamentCreate, TournamentRead, GameStartRequest, GameSessionRead, GameAdvanceRequest
from database import crud

router = APIRouter(tags=["game"])

def sessionToDict(session):
    return {
        "id": session.id,
        "mode": session.mode,
        "status": session.status,
        "currentPhase": session.currentPhase,
        "currentRound": session.currentRound,
        "currentLevel": session.currentLevel,
        "currentMinBet": session.currentMinBet,
        "currentMaxBet": session.currentMaxBet,
        "players": [sp.player for sp in session.sessionPlayers],
    }

@router.get("/game")
def getGameState(db: Session = Depends(getDb)):
    session = crud.getActiveSession(db)
    settings = crud.getSettings(db)
    if session:
        return {
            "phase": session.currentPhase,
            "round": session.currentRound,
            "level": session.currentLevel,
            "minBet": session.currentMinBet,
            "maxBet": session.currentMaxBet,
            "betMultiplier": settings.betMultiplier,
            "gameMode": session.mode,
            "sessionId": session.id,
        }
    return {
        "phase": "lobby",
        "round": 0,
        "level": 1,
        "minBet": settings.minBet,
        "maxBet": settings.maxBet,
        "betMultiplier": settings.betMultiplier,
        "gameMode": settings.gameMode,
        "sessionId": None,
    }

@router.post("/game/start", response_model=GameSessionRead)
def startGame(data: GameStartRequest, db: Session = Depends(getDb)):
    if not data.playerIds:
        raise HTTPException(status_code=400, detail="No players provided")
    session = crud.startGame(db, data)
    if not session:
        raise HTTPException(status_code=400, detail="One or more players not found or already eliminated")
    return sessionToDict(session)

@router.post("/game/advance")
def advanceGame(data: GameAdvanceRequest, db: Session = Depends(getDb)):
    session = crud.advanceGame(db, data)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return {
        "phase": session.currentPhase,
        "round": session.currentRound,
        "level": session.currentLevel,
        "minBet": session.currentMinBet,
        "maxBet": session.currentMaxBet,
    }

@router.post("/game/stop")
def stopGame(db: Session = Depends(getDb)):
    session = crud.stopGame(db)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return {"message": "Game stopped"}

@router.get("/game/session", response_model=GameSessionRead)
def getSession(db: Session = Depends(getDb)):
    session = crud.getActiveSession(db)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return sessionToDict(session)

@router.post("/tournaments", response_model=TournamentRead)
def createTournament(data: TournamentCreate, db: Session = Depends(getDb)):
    return crud.createTournament(db, data)

@router.get("/tournaments/{tournamentId}", response_model=TournamentRead)
def getTournament(tournamentId: int, db: Session = Depends(getDb)):
    tournament = crud.getTournament(db, tournamentId)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament
