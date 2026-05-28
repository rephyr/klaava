from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PlayerCreate(BaseModel):
    name: str
    klaava: int = 500
    rfid: Optional[str] = None
    powerup: Optional[str] = None

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    klaava: Optional[int] = None
    rfid: Optional[str] = None
    eliminated: Optional[bool] = None
    powerup: Optional[str] = None

class PlayerRead(BaseModel):
    id: int
    name: str
    klaava: int
    rfid: Optional[str]
    eliminated: bool
    powerup: Optional[str]
    createdAt: datetime

    model_config = {"from_attributes": True}

class TournamentCreate(BaseModel):
    mode: str  # sit_and_go | tournament

class TournamentRead(BaseModel):
    id: int
    mode: str
    status: str
    createdAt: datetime

    model_config = {"from_attributes": True}

class LoanCreate(BaseModel):
    playerId: int
    amount: int
    interestRate: float = 0.10

class LoanRead(BaseModel):
    id: int
    playerId: int
    amount: int
    interestRate: float
    amountOwed: int
    status: str
    createdAt: datetime

    model_config = {"from_attributes": True}

class SettingsRead(BaseModel):
    startingKlaava: int
    initialStake: int
    stakeMultiplier: float
    loanInterestRate: float
    maxLoanAmount: int
    gameMode: str

    model_config = {"from_attributes": True}

class SettingsUpdate(BaseModel):
    startingKlaava: Optional[int] = None
    initialStake: Optional[int] = None
    stakeMultiplier: Optional[float] = None
    loanInterestRate: Optional[float] = None
    maxLoanAmount: Optional[int] = None
    gameMode: Optional[str] = None
