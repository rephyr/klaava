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
    hand: str = "main"  # "main" | "split"

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
            "powerupTriggered": None,
            "splitHand": None,
            "splitTotal": None,
            "splitStatus": None,
            "splitResult": None,
            "splitAmount": 0,
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
    if not player:
        raise HTTPException(status_code=400, detail="Player not found")
    if data.hand == "split":
        if player.get("splitHand") is None or player["splitStatus"] != "active":
            raise HTTPException(status_code=400, detail="Cannot hit split hand")
        player["splitHand"].append(_bj["deck"].pop())
        player["splitTotal"] = handTotal(player["splitHand"])
        if player["splitTotal"] > 21:
            player["splitStatus"] = "bust"
        elif player["splitTotal"] == 21:
            player["splitStatus"] = "stood"
    else:
        if player["status"] != "active":
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
    if not player:
        raise HTTPException(status_code=400, detail="Player not found")
    if data.hand == "split":
        if player.get("splitHand") is None or player["splitStatus"] != "active":
            raise HTTPException(status_code=400, detail="Cannot stand split hand")
        player["splitStatus"] = "stood"
    else:
        if player["status"] != "active":
            raise HTTPException(status_code=400, detail="Player cannot stand")
        player["status"] = "stood"
    return _bj

@router.post("/split")
def splitHand(data: BjActionRequest):
    player = next((p for p in _bj["players"] if p["playerId"] == data.playerId), None)
    if not player:
        raise HTTPException(status_code=400, detail="Player not found")
    if player["status"] != "active":
        raise HTTPException(status_code=400, detail="Player cannot split")
    if len(player["hand"]) != 2:
        raise HTTPException(status_code=400, detail="Can only split with exactly 2 cards")
    if player["hand"][0]["value"] != player["hand"][1]["value"]:
        raise HTTPException(status_code=400, detail="Cards must have the same value to split")
    if player.get("splitHand") is not None:
        raise HTTPException(status_code=400, detail="Already split")

    splitCard = player["hand"].pop()
    player["hand"].append(_bj["deck"].pop())
    player["total"] = handTotal(player["hand"])
    player["status"] = "blackjack" if player["total"] == 21 else "active"

    player["splitHand"] = [splitCard, _bj["deck"].pop()]
    player["splitTotal"] = handTotal(player["splitHand"])
    player["splitStatus"] = "blackjack" if player["splitTotal"] == 21 else "active"
    player["splitAmount"] = player["amount"]
    return _bj

@router.post("/double")
def doubleDown(data: BjActionRequest):
    player = next((p for p in _bj["players"] if p["playerId"] == data.playerId), None)
    if not player:
        raise HTTPException(status_code=400, detail="Player not found")
    if data.hand == "split":
        if player.get("splitHand") is None or player["splitStatus"] != "active":
            raise HTTPException(status_code=400, detail="Cannot double down")
        if len(player["splitHand"]) != 2:
            raise HTTPException(status_code=400, detail="Can only double down on 2 cards")
        player["splitAmount"] *= 2
        player["splitHand"].append(_bj["deck"].pop())
        player["splitTotal"] = handTotal(player["splitHand"])
        player["splitStatus"] = "bust" if player["splitTotal"] > 21 else "stood"
    else:
        if player["status"] != "active":
            raise HTTPException(status_code=400, detail="Cannot double down")
        if len(player["hand"]) != 2:
            raise HTTPException(status_code=400, detail="Can only double down on 2 cards")
        player["amount"] *= 2
        player["hand"].append(_bj["deck"].pop())
        player["total"] = handTotal(player["hand"])
        player["status"] = "bust" if player["total"] > 21 else "stood"
    return _bj

def resolveHand(pStatus, pTotal, pAmount, dealerBust, dealerTotal, db_player, applyPowerup):
    result = None
    powerupTriggered = None
    amount = int(pAmount)
    if pStatus == "bust":
        result = "lose"
        if applyPowerup and db_player.powerup in ("shield", "immunity"):
            powerupTriggered = db_player.powerup
            db_player.powerup = None
        else:
            db_player.klaava = max(0, db_player.klaava - amount)
    elif pStatus == "blackjack":
        result = "blackjack"
        gain = math.ceil(amount * 1.5)
        if applyPowerup and db_player.powerup in ("doubleDown", "jackpot"):
            mult = 3 if db_player.powerup == "jackpot" else 2
            gain *= mult
            powerupTriggered = db_player.powerup
            db_player.powerup = None
        db_player.klaava += gain
    elif dealerBust or pTotal > dealerTotal:
        result = "win"
        gain = amount
        if applyPowerup and db_player.powerup in ("doubleDown", "jackpot"):
            mult = 3 if db_player.powerup == "jackpot" else 2
            gain *= mult
            powerupTriggered = db_player.powerup
            db_player.powerup = None
        db_player.klaava += gain
    elif pTotal == dealerTotal:
        result = "push"
    else:
        result = "lose"
        if applyPowerup and db_player.powerup in ("shield", "immunity"):
            powerupTriggered = db_player.powerup
            db_player.powerup = None
        else:
            db_player.klaava = max(0, db_player.klaava - amount)
    return result, powerupTriggered

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
        db_player = getPlayer(db, int(player["playerId"]))
        if not db_player:
            continue
        result, powerupTriggered = resolveHand(
            player["status"], player["total"], player["amount"],
            dealerBust, dealerTotal, db_player, applyPowerup=True
        )
        player["result"] = result
        player["powerupTriggered"] = powerupTriggered
        if player.get("splitHand") is not None:
            splitResult, _ = resolveHand(
                player["splitStatus"], player["splitTotal"], player["splitAmount"],
                dealerBust, dealerTotal, db_player, applyPowerup=False
            )
            player["splitResult"] = splitResult
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
