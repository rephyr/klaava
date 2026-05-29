from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database.connection import getDb
from database.crud import getPlayer
from pydantic import BaseModel
import random
import math

router = APIRouter(prefix="/blackjack", tags=["blackjack"])

SUITS = ["♠", "♥", "♦", "♣"]
LABELS = {1: "A", 11: "J", 12: "Q", 13: "K"}
RED_SUITS = {"♥", "♦"}

def makeCard(value, suit):
    return {"value": value, "suit": suit, "label": LABELS.get(value, str(value)), "red": suit in RED_SUITS}

def makeDeck():
    deck = [makeCard(v, s) for v in range(1, 14) for s in SUITS]
    random.shuffle(deck)
    return deck

def bjValue(card):
    if card["label"] == "A": return 11
    if card["value"] >= 10: return 10
    return card["value"]

def handTotal(hand):
    total = sum(bjValue(c) for c in hand)
    aces = sum(1 for c in hand if c["label"] == "A")
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return total

_bj = {
    "status": "idle",
    "deck": [],
    "dealer": {"hand": [], "hiddenCard": None, "total": 0},
    "players": [],
}

class BjBet(BaseModel):
    playerId: int
    playerName: str
    amount: int

class BjStartRequest(BaseModel):
    bets: list[BjBet]

class BjActionRequest(BaseModel):
    playerId: int

@router.get("/state")
def getBjState():
    return _bj

@router.post("/start")
def startBlackjack(data: BjStartRequest):
    _bj["deck"] = makeDeck()
    _bj["players"] = []
    for bet in data.bets:
        hand = [_bj["deck"].pop(), _bj["deck"].pop()]
        total = handTotal(hand)
        status = "blackjack" if total == 21 else "active"
        _bj["players"].append({
            "playerId": bet.playerId,
            "playerName": bet.playerName,
            "amount": bet.amount,
            "hand": hand,
            "total": total,
            "status": status,
            "result": None,
        })
    dealerHand = [_bj["deck"].pop(), _bj["deck"].pop()]
    _bj["dealer"] = {
        "hand": [dealerHand[0]],
        "hiddenCard": dealerHand[1],
        "total": bjValue(dealerHand[0]),
    }
    _bj["status"] = "playing"
    return _bj

@router.post("/hit")
def hit(data: BjActionRequest):
    player = next((p for p in _bj["players"] if p["playerId"] == data.playerId), None)
    if not player or player["status"] != "active":
        raise HTTPException(status_code=400, detail="Player cannot hit")
    player["hand"].append(_bj["deck"].pop())
    player["total"] = handTotal(player["hand"])
    if player["total"] > 21:
        player["status"] = "bust"
    elif player["total"] == 21:
        player["status"] = "stood"
    return _bj

@router.post("/stand")
def stand(data: BjActionRequest):
    player = next((p for p in _bj["players"] if p["playerId"] == data.playerId), None)
    if not player or player["status"] != "active":
        raise HTTPException(status_code=400, detail="Player cannot stand")
    player["status"] = "stood"
    return _bj

@router.post("/dealer")
def dealerPlay(db: Session = Depends(getDb)):
    if _bj["status"] != "playing":
        raise HTTPException(status_code=400, detail="No active blackjack game")
    dealer = _bj["dealer"]
    dealer["hand"].append(dealer["hiddenCard"])
    dealer["hiddenCard"] = None
    dealer["total"] = handTotal(dealer["hand"])
    while dealer["total"] < 17:
        dealer["hand"].append(_bj["deck"].pop())
        dealer["total"] = handTotal(dealer["hand"])
    _bj["status"] = "finished"
    dealerTotal = dealer["total"]
    dealerBust = dealerTotal > 21
    for player in _bj["players"]:
        playerId = int(player["playerId"])
        db_player = getPlayer(db, playerId)
        if not db_player:
            continue
        pTotal = player["total"]
        amount = int(player["amount"])
        if player["status"] == "bust":
            player["result"] = "lose"
            db_player.klaava = max(0, db_player.klaava - amount)
        elif player["status"] == "blackjack":
            player["result"] = "blackjack"
            db_player.klaava += math.ceil(amount * 1.5)
        elif dealerBust or pTotal > dealerTotal:
            player["result"] = "win"
            db_player.klaava += amount
        elif pTotal == dealerTotal:
            player["result"] = "push"
        else:
            player["result"] = "lose"
            db_player.klaava = max(0, db_player.klaava - amount)
        if db_player.klaava == 0:
            db_player.eliminated = True
    db.commit()
    return _bj

@router.post("/reset")
def resetBlackjack():
    _bj["status"] = "idle"
    _bj["deck"] = []
    _bj["dealer"] = {"hand": [], "hiddenCard": None, "total": 0}
    _bj["players"] = []
    return _bj
