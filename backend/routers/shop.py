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

@router.post("/use")
def useItem(data: UseRequest, db: Session = Depends(getDb)):
    player = getPlayer(db, data.playerId)
    if not player or not player.powerup:
        raise HTTPException(status_code=400, detail="Player has no powerup")

    powerupId = player.powerup

    if powerupId == "steal":
        if not data.targetId:
            raise HTTPException(status_code=400, detail="Steal requires a target")
        target = getPlayer(db, data.targetId)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        session = getActiveSession(db)
        amount = min(session.currentMinBet if session else 50, target.klaava)
        target.klaava -= amount
        player.klaava += amount
        player.powerup = None
        db.commit()
        db.refresh(player)
        db.refresh(target)
        return {"effect": "steal", "amount": amount, "player": player, "target": target}

    if powerupId == "sabotage":
        if not data.targetId:
            raise HTTPException(status_code=400, detail="Sabotage requires a target")
        target = getPlayer(db, data.targetId)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        removedItem = target.powerup
        target.powerup = None
        player.powerup = None
        db.commit()
        db.refresh(player)
        db.refresh(target)
        return {"effect": "sabotage", "removedItem": removedItem, "player": player, "target": target}

    if powerupId == "heist":
        if not data.targetId:
            raise HTTPException(status_code=400, detail="Heist requires a target")
        target = getPlayer(db, data.targetId)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        amount = target.klaava // 2
        target.klaava -= amount
        player.klaava += amount
        player.powerup = None
        db.commit()
        db.refresh(player)
        db.refresh(target)
        return {"effect": "heist", "amount": amount, "player": player, "target": target}

    if powerupId == "tax":
        session = getActiveSession(db)
        if not session:
            raise HTTPException(status_code=400, detail="No active session")
        minBet = session.currentMinBet
        activePlayers = [sp.player for sp in session.sessionPlayers if sp.player and not sp.player.eliminated and sp.player.id != player.id]
        totalCollected = 0
        for p in activePlayers:
            collected = min(minBet, p.klaava)
            p.klaava -= collected
            totalCollected += collected
        player.klaava += totalCollected
        player.powerup = None
        db.commit()
        db.refresh(player)
        for p in activePlayers:
            db.refresh(p)
        return {"effect": "tax", "amount": totalCollected, "player": player, "affected": activePlayers}

    if powerupId == "swap":
        if not data.targetId:
            raise HTTPException(status_code=400, detail="Swap requires a target")
        target = getPlayer(db, data.targetId)
        if not target:
            raise HTTPException(status_code=404, detail="Target not found")
        player.klaava, target.klaava = target.klaava, player.klaava
        player.powerup = None
        db.commit()
        db.refresh(player)
        db.refresh(target)
        return {"effect": "swap", "player": player, "target": target}

    raise HTTPException(status_code=400, detail=f"{powerupId} triggers automatically — no manual use needed")
