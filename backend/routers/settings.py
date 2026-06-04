from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import SettingsRead, SettingsUpdate
from database import crud

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/", response_model=SettingsRead)
def getSettings(db: Session = Depends(getDb)):
    return crud.getSettings(db)

@router.put("/", response_model=SettingsRead)
def updateSettings(data: SettingsUpdate, db: Session = Depends(getDb)):
    return crud.updateSettings(db, data)
