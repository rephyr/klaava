from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import getDb
from database.schemas import LoanCreate, LoanRead
from database import crud

router = APIRouter(prefix="/loans", tags=["loans"])

@router.post("/", response_model=LoanRead)
def createLoan(data: LoanCreate, db: Session = Depends(getDb)):
    settings = crud.getSettings(db)
    if data.interestRate is None:
        data = data.model_copy(update={"interestRate": settings.loanInterestRate})
    maxLoan = settings.maxBet * 4
    if data.amount > maxLoan:
        raise HTTPException(status_code=400, detail=f"Loan amount exceeds maximum ({maxLoan})")
    existingLoan = crud.getLoansByPlayer(db, data.playerId)
    if existingLoan:
        raise HTTPException(status_code=400, detail="Player already has an active loan")
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

class PartialRepayRequest(BaseModel):
    amount: int

@router.post("/{loanId}/partial", response_model=LoanRead)
def partialRepayLoan(loanId: int, data: PartialRepayRequest, db: Session = Depends(getDb)):
    loan = crud.partialRepayLoan(db, loanId, data.amount)
    if not loan:
        raise HTTPException(status_code=400, detail="Loan not found, not active, or invalid amount")
    return loan

@router.post("/interest/apply", response_model=list[LoanRead])
def applyInterest(db: Session = Depends(getDb)):
    return crud.applyInterest(db)
