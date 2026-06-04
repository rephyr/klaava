from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import PlayerCreate, PlayerUpdate, PlayerRead
from database import crud

router = APIRouter(prefix="/players", tags=["players"])

@router.get("/", response_model=list[PlayerRead])
def getPlayers(db: Session = Depends(getDb)):
    return crud.getPlayers(db)

@router.get("/{playerId}", response_model=PlayerRead)
def getPlayer(playerId: int, db: Session = Depends(getDb)):
    player = crud.getPlayer(db, playerId)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.post("/", response_model=PlayerRead)
def createPlayer(data: PlayerCreate, db: Session = Depends(getDb)):
    if data.klaava is None:
        settings = crud.getSettings(db)
        data = data.model_copy(update={"klaava": settings.startingKlaava})
    return crud.createPlayer(db, data)

@router.put("/{playerId}", response_model=PlayerRead)
def updatePlayer(playerId: int, data: PlayerUpdate, db: Session = Depends(getDb)):
    player = crud.updatePlayer(db, playerId, data)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.delete("/{playerId}", response_model=PlayerRead)
def deletePlayer(playerId: int, db: Session = Depends(getDb)):
    player = crud.deletePlayer(db, playerId)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player
