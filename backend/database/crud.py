from sqlalchemy.orm import Session
from .models import Player, Tournament, Loan, Settings
from .schemas import PlayerCreate, PlayerUpdate, TournamentCreate, LoanCreate, SettingsUpdate
import math

def getPlayers(db: Session):
    return db.query(Player).all()

def getPlayer(db: Session, playerId: int):
    return db.query(Player).filter(Player.id == playerId).first()

def createPlayer(db: Session, data: PlayerCreate):
    player = Player(**data.model_dump())
    db.add(player)
    db.commit()
    db.refresh(player)
    return player

def updatePlayer(db: Session, playerId: int, data: PlayerUpdate):
    player = getPlayer(db, playerId)
    if not player:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(player, field, value)
    db.commit()
    db.refresh(player)
    return player

def deletePlayer(db: Session, playerId: int):
    player = getPlayer(db, playerId)
    if not player:
        return None
    db.delete(player)
    db.commit()
    return player

def createTournament(db: Session, data: TournamentCreate):
    tournament = Tournament(**data.model_dump())
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament

def getTournament(db: Session, tournamentId: int):
    return db.query(Tournament).filter(Tournament.id == tournamentId).first()

def createLoan(db: Session, data: LoanCreate):
    loan = Loan(
        playerId=data.playerId,
        amount=data.amount,
        interestRate=data.interestRate,
        amountOwed=data.amount,
    )
    player = getPlayer(db, data.playerId)
    if player:
        player.klaava += data.amount
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan

def getLoansByPlayer(db: Session, playerId: int):
    return db.query(Loan).filter(Loan.playerId == playerId, Loan.status == "active").all()

def applyInterest(db: Session):
    activeLoans = db.query(Loan).filter(Loan.status == "active").all()
    for loan in activeLoans:
        interest = math.ceil(loan.amountOwed * loan.interestRate)
        loan.amountOwed = loan.amountOwed + interest
    db.commit()
    return activeLoans

def repayLoan(db: Session, loanId: int):
    loan = db.query(Loan).filter(Loan.id == loanId).first()
    if not loan or loan.status != "active":
        return None
    player = getPlayer(db, loan.playerId)
    if player and player.klaava >= loan.amountOwed:
        player.klaava -= loan.amountOwed
        loan.status = "paid"
        db.commit()
        db.refresh(loan)
        return loan
    return None

def defaultLoan(db: Session, loanId: int):
    loan = db.query(Loan).filter(Loan.id == loanId).first()
    if not loan:
        return None
    loan.status = "defaulted"
    player = getPlayer(db, loan.playerId)
    if player:
        player.eliminated = True
    db.commit()
    db.refresh(loan)
    return loan

def getSettings(db: Session):
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def updateSettings(db: Session, data: SettingsUpdate):
    settings = getSettings(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
