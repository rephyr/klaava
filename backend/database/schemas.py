from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PlayerCreate(BaseModel):
    name: str
    klaava: Optional[int] = None  # falls back to settings.startingKlaava
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

class GameStartRequest(BaseModel):
    playerIds: list[int]
    mode: Optional[str] = None  # falls back to settings.gameMode

class GameAdvanceRequest(BaseModel):
    phase: Optional[str] = None       # set phase directly: gambling | minigame | bracket
    nextRound: Optional[bool] = False  # increment round number
    nextLevel: Optional[bool] = False  # increment level and apply stake multiplier

class GameSessionRead(BaseModel):
    id: int
    mode: str
    status: str
    currentPhase: str
    currentRound: int
    currentLevel: int
    currentMinBet: int
    currentMaxBet: int
    players: list[PlayerRead]

    model_config = {"from_attributes": True}

class TransferRequest(BaseModel):
    fromPlayerId: int
    toPlayerId: int
    amount: int

class TransferResult(BaseModel):
    winner: PlayerRead
    loser: PlayerRead
    amount: int

    model_config = {"from_attributes": True}

class LoanCreate(BaseModel):
    playerId: int
    amount: int
    interestRate: Optional[float] = None  # falls back to settings.loanInterestRate

class LoanRead(BaseModel):
    id: int
    playerId: int
    amount: int
    interestRate: float
    amountOwed: int
    status: str
    createdAt: datetime

    model_config = {"from_attributes": True}

class GameCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GameRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    isActive: bool
    createdAt: datetime

    model_config = {"from_attributes": True}

class SettingsRead(BaseModel):
    startingKlaava: int
    minBet: int
    maxBet: int
    betMultiplier: float
    loanInterestRate: float
    maxLoanAmount: int
    gameMode: str

    model_config = {"from_attributes": True}

class SettingsUpdate(BaseModel):
    startingKlaava: Optional[int] = None
    minBet: Optional[int] = None
    maxBet: Optional[int] = None
    betMultiplier: Optional[float] = None
    loanInterestRate: Optional[float] = None
    maxLoanAmount: Optional[int] = None
    gameMode: Optional[str] = None
