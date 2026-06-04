from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database.connection import getDb
from database.crud import getPlayer, getActiveSession, checkBankruptcy
from pydantic import BaseModel
import random

router = APIRouter(prefix="/hiLo", tags=["hiLo"])

SUITS = ["♠", "♥", "♦", "♣"]
LABELS = {1: "A", 11: "J", 12: "Q", 13: "K"}
RED_SUITS = {"♥", "♦"}

def makeCard(value, suit):
    return {
        "value": value,
        "suit": suit,
        "label": LABELS.get(value, str(value)),
        "red": suit in RED_SUITS,
    }

def makeDeck():
    deck = [makeCard(v, s) for v in range(1, 14) for s in SUITS]
    random.shuffle(deck)
    return deck

_state = {
    "deck": [],
    "currentCard": None,
    "previousCard": None,
    "status": "idle",
    "result": None,
    "bets": [],
}

class BetRequest(BaseModel):
    playerId: int
    playerName: str
    guess: str
    amount: int

@router.post("/start")
def startHiLo():
    _state["deck"] = makeDeck()
    _state["currentCard"] = _state["deck"].pop()
    _state["previousCard"] = None
    _state["status"] = "waiting"
    _state["result"] = None
    _state["bets"] = []
    return _state

@router.post("/bet")
def placeBet(data: BetRequest, db: Session = Depends(getDb)):
    session = getActiveSession(db)
    if session and data.amount < session.currentMinBet:
        raise HTTPException(status_code=400, detail=f"Bet {data.amount} is below minimum {session.currentMinBet}")
    existing = next((b for b in _state["bets"] if b["playerId"] == data.playerId), None)
    if existing:
        existing["guess"] = data.guess
        existing["amount"] = data.amount
        existing["result"] = None
        existing["powerupTriggered"] = None
    else:
        _state["bets"].append({
            "playerId": data.playerId,
            "playerName": data.playerName,
            "guess": data.guess,
            "amount": data.amount,
            "result": None,
            "powerupTriggered": None,
        })
    return _state["bets"]

@router.post("/reveal")
def revealCard(db: Session = Depends(getDb)):
    if _state["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Not waiting for a guess")
    if not _state["deck"]:
        raise HTTPException(status_code=400, detail="Deck is empty")
    _state["previousCard"] = _state["currentCard"]
    _state["currentCard"] = _state["deck"].pop()
    prev = _state["previousCard"]["value"]
    curr = _state["currentCard"]["value"]
    cardResult = "higher" if curr > prev else "lower" if curr < prev else "equal"
    _state["result"] = cardResult
    _state["status"] = "revealed"
    for bet in _state["bets"]:
        player = getPlayer(db, bet["playerId"])
        if not player:
            continue
        correct = bet["guess"] == cardResult or (cardResult == "equal")
        bet["result"] = "correct" if correct else "wrong"
        bet["powerupTriggered"] = None
        if correct:
            gain = bet["amount"]
            if player.powerup in ("doubleDown", "jackpot"):
                mult = 3 if player.powerup == "jackpot" else 2
                gain *= mult
                bet["powerupTriggered"] = player.powerup
                player.powerup = None
            player.klaava += gain
        else:
            if player.powerup in ("shield", "immunity"):
                bet["powerupTriggered"] = player.powerup
                player.powerup = None
            else:
                player.klaava = max(0, player.klaava - bet["amount"])
                checkBankruptcy(db, player)
    db.commit()
    return _state

@router.post("/next")
def nextRound():
    if _state["status"] != "revealed":
        raise HTTPException(status_code=400, detail="Reveal the card first")
    _state["previousCard"] = None
    _state["status"] = "waiting"
    _state["result"] = None
    _state["bets"] = []
    return _state

def resetState():
    _state["deck"] = []
    _state["currentCard"] = None
    _state["previousCard"] = None
    _state["status"] = "idle"
    _state["result"] = None
    _state["bets"] = []

@router.get("/state")
def getHiLoState():
    return _state
