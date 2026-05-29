from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import TournamentCreate, TournamentRead, GameStartRequest, GameSessionRead, GameAdvanceRequest, TransferRequest
from database import crud
import random

router = APIRouter(tags=["game"])

_liveState = {
    "lastResult": None,
    "wheelAngle": 0,
}

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
    activeGames = crud.getGames(db)
    segments = [g.name for g in activeGames if g.isActive]
    base = {
        "lastResult": _liveState["lastResult"],
        "wheelAngle": _liveState["wheelAngle"],
        "wheelSegments": segments,
    }
    if session:
        return {
            **base,
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
        **base,
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
    _liveState["lastResult"] = None
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

@router.post("/game/transfer")
def transferKlaava(data: TransferRequest, db: Session = Depends(getDb)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    result = crud.transferKlaava(db, data)
    if not result:
        raise HTTPException(status_code=400, detail="Transfer failed — player not found or insufficient klaava")
    _liveState["lastResult"] = f"{result['loser'].name} paid {data.amount} kl to {result['winner'].name}"
    return result

@router.post("/game/wheel/spin")
def spinWheel(db: Session = Depends(getDb)):
    activeGames = crud.getGames(db)
    segments = [g.name for g in activeGames if g.isActive]
    if not segments:
        raise HTTPException(status_code=400, detail="No active games to spin")
    winnerIndex = random.randint(0, len(segments) - 1)
    segmentAngle = 360 / len(segments)
    # Arrow sits at top of wheel = 270° in canvas coords (canvas 0° = right).
    # Center of winner segment in canvas degrees:
    centerOfWinner = (winnerIndex + 0.5) * segmentAngle
    # Additional degrees needed from current wheel position to land winner under arrow.
    prevAngle = _liveState["wheelAngle"]
    additionalDeg = (270 - centerOfWinner - prevAngle) % 360
    spins = random.randint(5, 8)
    landAngle = prevAngle + additionalDeg + spins * 360
    _liveState["wheelAngle"] = landAngle
    return {
        "angle": landAngle,
        "winner": segments[winnerIndex],
        "winnerIndex": winnerIndex,
    }

@router.post("/game/stop")
def stopGame(db: Session = Depends(getDb)):
    session = crud.stopGame(db)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    _liveState["lastResult"] = None
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
