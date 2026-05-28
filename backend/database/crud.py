from sqlalchemy.orm import Session
from .models import Player, Tournament, TournamentPlayer, Loan, Settings
from .schemas import PlayerCreate, PlayerUpdate, TournamentCreate, LoanCreate, SettingsUpdate, GameStartRequest, GameAdvanceRequest
import math
import json
from datetime import datetime


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

def startGame(db: Session, data: GameStartRequest):
    settings = getSettings(db)
    mode = data.mode or settings.gameMode
    players = db.query(Player).filter(Player.id.in_(data.playerIds), Player.eliminated.is_(False)).all()
    if len(players) != len(data.playerIds):
        return None
    tournament = Tournament(
        mode=mode,
        status="active",
        currentPhase="gambling",
        currentRound=1,
        currentLevel=1,
        currentMinBet=settings.minBet,
        currentMaxBet=settings.maxBet,
    )
    db.add(tournament)
    db.flush()
    for player in players:
        db.add(TournamentPlayer(tournamentId=tournament.id, playerId=player.id))
    db.commit()
    db.refresh(tournament)
    return tournament

def getActiveSession(db: Session):
    return db.query(Tournament).filter(Tournament.status == "active").order_by(Tournament.id.desc()).first()

def advanceGame(db: Session, data: GameAdvanceRequest):
    session = getActiveSession(db)
    if not session:
        return None
    if data.phase:
        session.currentPhase = data.phase
    if data.nextRound:
        session.currentRound += 1
    if data.nextLevel:
        settings = getSettings(db)
        session.currentLevel += 1
        session.currentMinBet = round(session.currentMinBet * settings.betMultiplier)
        session.currentMaxBet = round(session.currentMaxBet * settings.betMultiplier)
    db.commit()
    db.refresh(session)
    return session

def stopGame(db: Session):
    session = getActiveSession(db)
    if not session:
        return None
    session.status = "finished"
    session.currentPhase = "finished"
    db.commit()
    db.refresh(session)
    return session

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

def backupToJson(db: Session):
    players = getPlayers(db)
    settings = getSettings(db)
    loans = db.query(Loan).all()
    data = {
        "timestamp": datetime.now().isoformat(),
        "players": [
            {
                "id": p.id,
                "name": p.name,
                "klaava": p.klaava,
                "rfid": p.rfid,
                "eliminated": p.eliminated,
                "powerup": p.powerup,
            }
            for p in players
        ],
        "settings": {
            "startingKlaava": settings.startingKlaava,
            "minBet": settings.minBet,
            "maxBet": settings.maxBet,
            "betMultiplier": settings.betMultiplier,
            "loanInterestRate": settings.loanInterestRate,
            "maxLoanAmount": settings.maxLoanAmount,
            "gameMode": settings.gameMode,
        },
        "loans": [
            {
                "id": loan.id,
                "playerId": loan.playerId,
                "amount": loan.amount,
                "interestRate": loan.interestRate,
                "amountOwed": loan.amountOwed,
                "status": loan.status,
                "createdAt": loan.createdAt.isoformat() if loan.createdAt else None,
            }
            for loan in loans
        ],
    }
    with open("backup.json", "w") as f:
        json.dump(data, f, indent=2)
    
def restoreFromJson(db: Session):
    with open("backup.json", "r") as f:
        data = json.load(f)
    db.query(Loan).delete()
    db.query(Player).delete()
    for p in data["players"]:
        db.add(Player(
            id=p["id"],
            name=p["name"],
            klaava=p["klaava"],
            rfid=p["rfid"],
            eliminated=p["eliminated"],
            powerup=p["powerup"],
        ))
    for loan in data["loans"]:
        db.add(Loan(
            id=loan["id"],
            playerId=loan["playerId"],
            amount=loan["amount"],
            interestRate=loan["interestRate"],
            amountOwed=loan["amountOwed"],
            status=loan["status"],
        ))
    settings = getSettings(db)
    for field, value in data["settings"].items():
        setattr(settings, field, value)
    db.commit()