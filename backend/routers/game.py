from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import getDb
from database.schemas import TournamentCreate, TournamentRead, GameStartRequest, GameSessionRead, GameAdvanceRequest, TransferRequest
from database import crud
import random

router = APIRouter(tags=["game"])

_liveState = {
    "lastResult": None,
    "wheelAngle": 0,
    "minigame": None,
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
        "players": [sp.player for sp in session.sessionPlayers if sp.player is not None],
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
        "minigame": _liveState["minigame"],
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
    _liveState["minigame"] = None
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
    loserName = result['loser'].name
    winnerName = result['winner'].name
    amt = result['amount']
    if result['loserPowerupTriggered'] == 'immunity':
        msg = f"{loserName} used IMMUNITY — {winnerName} got {amt} kl from house"
    elif result['winnerPowerupTriggered'] in ('doubleDown', 'jackpot'):
        label = 'JACKPOT' if result['winnerPowerupTriggered'] == 'jackpot' else 'DD'
        msg = f"{loserName} paid {amt} kl → {winnerName} ({label}!)"
    else:
        msg = f"{loserName} paid {amt} kl to {winnerName}"
    _liveState["lastResult"] = msg
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
    _liveState["minigame"] = None
    return {"message": "Game stopped"}


class DoubleOrNothingRequest(BaseModel):
    playerIds: list[int]
    amount: int

@router.post("/minigame/doubleOrNothing")
def playDoubleOrNothing(data: DoubleOrNothingRequest, db: Session = Depends(getDb)):
    results = []
    for playerId in data.playerIds:
        player = crud.getPlayer(db, playerId)
        if not player or player.eliminated:
            continue
        actualAmount = min(data.amount, player.klaava)
        won = random.random() < 0.5
        powerupTriggered = None
        if won:
            effectiveGain = actualAmount
            if player.powerup in ("doubleDown", "jackpot"):
                mult = 3 if player.powerup == "jackpot" else 2
                effectiveGain *= mult
                powerupTriggered = player.powerup
                player.powerup = None
            player.klaava += effectiveGain
            actualAmount = effectiveGain
        else:
            if player.powerup in ("shield", "immunity"):
                powerupTriggered = player.powerup
                player.powerup = None
                actualAmount = 0
            else:
                player.klaava -= actualAmount
        results.append({
            "playerId": player.id,
            "name": player.name,
            "result": "win" if won else "lose",
            "amount": actualAmount,
            "klaava": player.klaava,
            "powerupTriggered": powerupTriggered,
        })
    db.commit()
    _liveState["minigame"] = {"type": "doubleOrNothing", "results": results}
    return {"results": results}


@router.post("/minigame/lastRoll")
def playLastRoll(db: Session = Depends(getDb)):
    session = crud.getActiveSession(db)
    if not session:
        raise HTTPException(status_code=400, detail="No active game")
    players = [sp.player for sp in session.sessionPlayers if sp.player and not sp.player.eliminated]
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 active players")

    rolls = {p.id: random.randint(1, 6) for p in players}
    minRoll = min(rolls.values())
    maxRoll = max(rolls.values())

    if minRoll == maxRoll:
        results = [{"playerId": p.id, "name": p.name, "roll": rolls[p.id], "outcome": "tie", "klaava": p.klaava} for p in players]
        _liveState["minigame"] = {"type": "lastRoll", "results": results, "amount": 0}
        return {"results": results, "amount": 0}

    amount = session.currentMinBet
    losers = [p for p in players if rolls[p.id] == minRoll]
    winners = [p for p in players if rolls[p.id] == maxRoll]

    blockedLosers = {}
    totalLost = 0
    for p in losers:
        if p.powerup in ("shield", "immunity"):
            blockedLosers[p.id] = p.powerup
            p.powerup = None
        else:
            actual = min(amount, p.klaava)
            p.klaava -= actual
            totalLost += actual

    boostedWinners = {}
    perWinner = totalLost // len(winners)
    remainder = totalLost % len(winners)
    for i, p in enumerate(winners):
        base = perWinner + (1 if i < remainder else 0)
        if p.powerup in ("doubleDown", "jackpot"):
            mult = 3 if p.powerup == "jackpot" else 2
            boostedWinners[p.id] = p.powerup
            p.powerup = None
            p.klaava += base * mult
        else:
            p.klaava += base

    db.commit()

    results = []
    for p in players:
        if rolls[p.id] == minRoll:
            outcome = "loser"
            pt = blockedLosers.get(p.id)
        elif rolls[p.id] == maxRoll:
            outcome = "winner"
            pt = boostedWinners.get(p.id)
        else:
            outcome = "neutral"
            pt = None
        results.append({"playerId": p.id, "name": p.name, "roll": rolls[p.id], "outcome": outcome, "klaava": p.klaava, "powerupTriggered": pt})

    _liveState["minigame"] = {"type": "lastRoll", "results": results, "amount": amount}
    return {"results": results, "amount": amount}

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
