from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import getDb
from database.schemas import LoanCreate, LoanRead
from database import crud

router = APIRouter(prefix="/loans", tags=["loans"])

@router.post("/", response_model=LoanRead)
def createLoan(data: LoanCreate, db: Session = Depends(getDb)):
    return crud.createLoan(db, data)

@router.get("/{playerId}", response_model=list[LoanRead])
def getLoansByPlayer(playerId: int, db: Session = Depends(getDb)):
    return crud.getLoansByPlayer(db, playerId)

@router.post("/{loanId}/repay", response_model=LoanRead)
def repayLoan(loanId: int, db: Session = Depends(getDb)):
    loan = crud.repayLoan(db, loanId)
    if not loan:
        raise HTTPException(status_code=400, detail="Cannot repay loan — not found, already paid, or insufficient klaava")
    return loan

@router.post("/{loanId}/default", response_model=LoanRead)
def defaultLoan(loanId: int, db: Session = Depends(getDb)):
    loan = crud.defaultLoan(db, loanId)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan

@router.post("/interest/apply", response_model=list[LoanRead])
def applyInterest(db: Session = Depends(getDb)):
    return crud.applyInterest(db)
