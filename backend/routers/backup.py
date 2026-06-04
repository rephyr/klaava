from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.crud import backupToJson, restoreFromJson
import os

router = APIRouter(prefix="/backup", tags=["backup"])

@router.post("/")
def createBackup(db: Session = Depends(getDb)):
    backupToJson(db)
    return {"message": "Backup created"}

@router.post("/restore")
def restoreBackup(db: Session = Depends(getDb)):
    if not os.path.exists("backup.json"):
        raise HTTPException(status_code=404, detail="No backup file found")
    restoreFromJson(db)
    return {"message": "Restore complete"}
