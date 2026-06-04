from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.crud import getPlayer, checkBankruptcy
from pydantic import BaseModel

router = APIRouter(prefix="/auction", tags=["auction"])

AUCTION_ITEMS = [
    {"id": "heist",    "name": "Heist",    "description": "Steal 50% of any player's klaava.",                          "passive": False},
    {"id": "immunity", "name": "Immunity", "description": "Block your next loss in any game. Auto-triggers.",            "passive": True},
    {"id": "jackpot",  "name": "Jackpot",  "description": "Triple your next win in any game. Auto-triggers.",            "passive": True},
    {"id": "tax",      "name": "Tax",      "description": "Collect the minimum bet from every other active player.",     "passive": False},
    {"id": "swap",     "name": "Swap",     "description": "Swap your klaava total with any player.",                     "passive": False},
]

_state = {
    "status": "idle",   # idle | open | finished
    "item": None,
    "bids": [],         # sorted highest first
    "winner": None,
}

class StartRequest(BaseModel):
    itemId: str

class BidRequest(BaseModel):
    playerId: int
    amount: int

@router.get("/items")
def getAuctionItems():
    return AUCTION_ITEMS

@router.get("/state")
def getAuctionState():
    return _state

@router.post("/start")
def startAuction(data: StartRequest):
    item = next((i for i in AUCTION_ITEMS if i["id"] == data.itemId), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    _state["status"] = "open"
    _state["item"] = item
    _state["bids"] = []
    _state["winner"] = None
    return _state

@router.post("/bid")
def placeBid(data: BidRequest, db: Session = Depends(getDb)):
    if _state["status"] != "open":
        raise HTTPException(status_code=400, detail="No active auction")
    player = getPlayer(db, data.playerId)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Bid must be positive")
    if data.amount > player.klaava:
        raise HTTPException(status_code=400, detail="Not enough klaava")
    topBid = max((b["amount"] for b in _state["bids"]), default=0)
    if data.amount <= topBid:
        raise HTTPException(status_code=400, detail=f"Bid must exceed current top of {topBid}")
    _state["bids"] = [b for b in _state["bids"] if b["playerId"] != data.playerId]
    _state["bids"].append({"playerId": player.id, "playerName": player.name, "amount": data.amount})
    _state["bids"].sort(key=lambda b: b["amount"], reverse=True)
    return _state

@router.post("/end")
def endAuction(db: Session = Depends(getDb)):
    if _state["status"] != "open":
        raise HTTPException(status_code=400, detail="No active auction")
    if not _state["bids"]:
        _state["status"] = "finished"
        _state["winner"] = None
        return _state
    topBid = _state["bids"][0]
    player = getPlayer(db, topBid["playerId"])
    if not player:
        raise HTTPException(status_code=404, detail="Winner not found")
    if player.klaava < topBid["amount"]:
        raise HTTPException(status_code=400, detail="Winner no longer has enough klaava")
    if player.powerup:
        raise HTTPException(status_code=400, detail=f"{player.name} already holds an item — clear it first")
    player.klaava -= topBid["amount"]
    player.powerup = _state["item"]["id"]
    checkBankruptcy(db, player)
    db.commit()
    db.refresh(player)
    _state["status"] = "finished"
    _state["winner"] = {
        "playerId": player.id,
        "playerName": player.name,
        "amount": topBid["amount"],
        "item": _state["item"],
    }
    return _state

def resetState():
    _state["status"] = "idle"
    _state["item"] = None
    _state["bids"] = []
    _state["winner"] = None

@router.post("/reset")
def resetAuction():
    resetState()
    return _state
