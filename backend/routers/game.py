from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import TournamentCreate, TournamentRead, GameStartRequest, GameSessionRead, GameAdvanceRequest
from database import crud

router = APIRouter(tags=["game"])

@router.get("/game")
def getGameState(db: Session = Depends(getDb)):
    session = crud.getActiveSession(db)
    if session:
        return {
            "phase": session.currentPhase,
            "round": session.currentRound,
            "level": session.currentLevel,
            "stake": session.currentStake,
            "stakeMultiplier": crud.getSettings(db).stakeMultiplier,
            "gameMode": session.mode,
            "sessionId": session.id,
        }
    settings = crud.getSettings(db)
    return {
        "phase": "lobby",
        "round": 0,
        "level": 1,
        "stake": settings.initialStake,
        "stakeMultiplier": settings.stakeMultiplier,
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
    return {
        "id": session.id,
        "mode": session.mode,
        "status": session.status,
        "currentPhase": session.currentPhase,
        "currentRound": session.currentRound,
        "currentLevel": session.currentLevel,
        "currentStake": session.currentStake,
        "players": [sp.player for sp in session.sessionPlayers],
    }

@router.post("/game/advance")
def advanceGame(data: GameAdvanceRequest, db: Session = Depends(getDb)):
    session = crud.advanceGame(db, data)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return {
        "phase": session.currentPhase,
        "round": session.currentRound,
        "level": session.currentLevel,
        "stake": session.currentStake,
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
    return {
        "id": session.id,
        "mode": session.mode,
        "status": session.status,
        "currentPhase": session.currentPhase,
        "currentRound": session.currentRound,
        "currentLevel": session.currentLevel,
        "currentStake": session.currentStake,
        "players": [sp.player for sp in session.sessionPlayers],
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
