from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.crud import getPlayer
from pydantic import BaseModel

router = APIRouter(prefix="/shop", tags=["shop"])

POWERUPS = [
    {"id": "item1", "name": "Item 1", "description": "Placeholder", "cost": 100},
    {"id": "item2", "name": "Item 2", "description": "Placeholder", "cost": 150},
    {"id": "item3", "name": "Item 3", "description": "Placeholder", "cost": 200},
    {"id": "item4", "name": "Item 4", "description": "Placeholder", "cost": 75},
]

class BuyRequest(BaseModel):
    playerId: int
    powerupId: str

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
    return {"player": {"id": player.id, "name": player.name, "klaava": player.klaava, "powerup": player.powerup}}
