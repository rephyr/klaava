from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.crud import getPlayer, getActiveSession
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/shop", tags=["shop"])

POWERUPS = [
    {
        "id": "doubleDown",
        "name": "Double Down",
        "description": "Your next gambling win pays double. Auto-triggers on your next win.",
        "cost": 150,
        "passive": True,
    },
    {
        "id": "steal",
        "name": "Steal",
        "description": "Take the current minimum bet from any player.",
        "cost": 100,
        "passive": False,
    },
    {
        "id": "shield",
        "name": "Shield",
        "description": "Block the next loss you'd take in a minigame. Auto-triggers.",
        "cost": 125,
        "passive": True,
    },
    {
        "id": "sabotage",
        "name": "Sabotage",
        "description": "Remove another player's item.",
        "cost": 200,
        "passive": False,
    },
]

class BuyRequest(BaseModel):
    playerId: int
    powerupId: str

class UseRequest(BaseModel):
    playerId: int
    targetId: Optional[int] = None

@router.get("/")
def getPowerups():
    return POWERUPS

@router.post("/buy")
def buyPowerup(data: BuyRequest, db: Session = Depends(getDb)):
    powerup = next((p for p in POWERUPS if p["id"] == data.powerupId), None)
    if not powerup:
        raise HTTPException(status_code=404, detail="Powerup not found")
    player = getPlayer(db, data.playerId)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if player.klaava < powerup["cost"]:
        raise HTTPException(status_code=400, detail="Not enough klaava")
    if player.powerup:
        raise HTTPException(status_code=400, detail="Player already has a powerup")
    player.klaava -= powerup["cost"]
    player.powerup = powerup["id"]
    db.commit()
    db.refresh(player)
    return {"player": player}

def _requireTarget(data, label):
    if not data.targetId:
        raise HTTPException(status_code=400, detail=f"{label} requires a target")
    return data.targetId

def _getTarget(db, targetId):
    target = getPlayer(db, targetId)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target

def _handleSteal(player, data, db):
    target = _getTarget(db, _requireTarget(data, "Steal"))
    session = getActiveSession(db)
    amount = min(session.currentMinBet if session else 50, target.klaava)
    target.klaava -= amount
    player.klaava += amount
    return {"effect": "steal", "amount": amount, "target": target}

def _handleSabotage(player, data, db):
    target = _getTarget(db, _requireTarget(data, "Sabotage"))
    removedItem = target.powerup
    target.powerup = None
    return {"effect": "sabotage", "removedItem": removedItem, "target": target}

def _handleHeist(player, data, db):
    target = _getTarget(db, _requireTarget(data, "Heist"))
    amount = target.klaava // 2
    target.klaava -= amount
    player.klaava += amount
    return {"effect": "heist", "amount": amount, "target": target}

def _handleTax(player, data, db):
    session = getActiveSession(db)
    if not session:
        raise HTTPException(status_code=400, detail="No active session")
    activePlayers = [sp.player for sp in session.sessionPlayers if sp.player and not sp.player.eliminated and sp.player.id != player.id]
    totalCollected = 0
    for p in activePlayers:
        collected = min(session.currentMinBet, p.klaava)
        p.klaava -= collected
        totalCollected += collected
    player.klaava += totalCollected
    return {"effect": "tax", "amount": totalCollected, "affected": activePlayers}

def _handleSwap(player, data, db):
    target = _getTarget(db, _requireTarget(data, "Swap"))
    player.klaava, target.klaava = target.klaava, player.klaava
    return {"effect": "swap", "target": target}

_POWERUP_HANDLERS = {
    "steal": _handleSteal,
    "sabotage": _handleSabotage,
    "heist": _handleHeist,
    "tax": _handleTax,
    "swap": _handleSwap,
}

@router.post("/use")
def useItem(data: UseRequest, db: Session = Depends(getDb)):
    player = getPlayer(db, data.playerId)
    if not player or not player.powerup:
        raise HTTPException(status_code=400, detail="Player has no powerup")

    handler = _POWERUP_HANDLERS.get(player.powerup)
    if not handler:
        raise HTTPException(status_code=400, detail=f"{player.powerup} triggers automatically — no manual use needed")

    result = handler(player, data, db)
    player.powerup = None
    db.commit()
    db.refresh(player)
    if "target" in result:
        db.refresh(result["target"])
    if "affected" in result:
        for p in result["affected"]:
            db.refresh(p)
    return {**result, "player": player}
