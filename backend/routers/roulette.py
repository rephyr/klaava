from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database.connection import getDb
from database.crud import getPlayer, getActiveSession, checkBankruptcy
from services.powerup import applyWinMultiplier, applyLossShield
from pydantic import BaseModel
import random

router = APIRouter(prefix="/roulette", tags=["roulette"])

RED_NUMBERS = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}

def numberColor(n):
    if n == 0:
        return "green"
    return "red" if n in RED_NUMBERS else "black"

_state = {
    "status": "idle",
    "bets": [],
    "result": None,
    "resultColor": None,
}

class RouletteBet(BaseModel):
    playerId: int
    playerName: str
    betType: str   # color | parity | number
    betValue: str  # red/black/green | odd/even | "0"-"36"
    amount: int

@router.get("/state")
def getRouletteState():
    return _state

@router.post("/start")
def startRoulette():
    _state["status"] = "betting"
    _state["bets"] = []
    _state["result"] = None
    _state["resultColor"] = None
    return _state

@router.post("/bet")
def placeBet(data: RouletteBet, db: Session = Depends(getDb)):
    session = getActiveSession(db)
    if session and data.amount < session.currentMinBet:
        raise HTTPException(status_code=400, detail=f"Bet {data.amount} is below minimum {session.currentMinBet}")
    existing = next((b for b in _state["bets"] if b["playerId"] == data.playerId), None)
    if existing:
        existing["betType"] = data.betType
        existing["betValue"] = data.betValue
        existing["amount"] = data.amount
        existing["result"] = None
        existing["payout"] = None
    else:
        _state["bets"].append({
            "playerId": data.playerId,
            "playerName": data.playerName,
            "betType": data.betType,
            "betValue": data.betValue,
            "amount": data.amount,
            "result": None,
            "payout": None,
        })
    return _state["bets"]

@router.post("/spin")
def spin(db: Session = Depends(getDb)):
    if _state["status"] != "betting":
        raise HTTPException(status_code=400, detail="Not in betting phase")
    result = random.randint(0, 36)
    color = numberColor(result)
    _state["result"] = result
    _state["resultColor"] = color
    _state["status"] = "finished"
    for bet in _state["bets"]:
        player = getPlayer(db, bet["playerId"])
        if not player:
            continue
        won = False
        payout = 0
        if bet["betType"] == "color":
            won = bet["betValue"] == color
            payout = bet["amount"]
        elif bet["betType"] == "parity":
            if result == 0:
                won = False
            elif bet["betValue"] == "odd":
                won = result % 2 == 1
            else:
                won = result % 2 == 0
            payout = bet["amount"]
        elif bet["betType"] == "number":
            won = int(bet["betValue"]) == result
            payout = bet["amount"] * 35
        bet["result"] = "win" if won else "lose"
        if won:
            payout, pt = applyWinMultiplier(player, payout)
            bet["powerupTriggered"] = pt
            bet["payout"] = payout
            player.klaava += payout
        else:
            pt = applyLossShield(player)
            bet["powerupTriggered"] = pt
            bet["payout"] = payout
            if pt is None:
                player.klaava = max(0, player.klaava - bet["amount"])
                checkBankruptcy(db, player)
    db.commit()
    return _state

def resetState():
    _state["status"] = "idle"
    _state["bets"] = []
    _state["result"] = None
    _state["resultColor"] = None

@router.post("/reset")
def resetRoulette():
    resetState()
    return _state
