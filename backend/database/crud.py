from sqlalchemy.orm import Session
from .models import Player, Tournament, TournamentPlayer, Round, Transaction, Loan, Settings, Game, Leaderboard
from .schemas import PlayerCreate, PlayerUpdate, TournamentCreate, LoanCreate, SettingsUpdate, GameStartRequest, GameAdvanceRequest, TransferRequest, GameCreate
from services.powerup import applyWinMultiplier
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
    db.query(Transaction).filter(Transaction.playerId == playerId).delete()
    db.query(Loan).filter(Loan.playerId == playerId).delete()
    db.query(TournamentPlayer).filter(TournamentPlayer.playerId == playerId).delete()
    db.query(Leaderboard).filter(Leaderboard.playerId == playerId).delete()
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

LOAN_MAX_TURNS = 3

def calcInterest(loan) -> int:
    return math.ceil(loan.amountOwed * loan.interestRate)

def applyInterest(db: Session):
    activeLoans = db.query(Loan).filter(Loan.status == "active").all()
    for loan in activeLoans:
        loan.amountOwed += calcInterest(loan)
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

def checkBankruptcy(db: Session, player):
    """Eliminate a player immediately if they hit 0 klaava while carrying an active loan."""
    if player.klaava <= 0:
        hasLoan = db.query(Loan).filter(
            Loan.playerId == player.id,
            Loan.status == "active"
        ).count() > 0
        if hasLoan:
            player.klaava = 0
            player.eliminated = True

def partialRepayLoan(db: Session, loanId: int, amount: int):
    loan = db.query(Loan).filter(Loan.id == loanId).first()
    if not loan or loan.status != "active":
        return None
    player = getPlayer(db, loan.playerId)
    if not player:
        return None
    pay = min(amount, player.klaava, loan.amountOwed)
    if pay <= 0:
        return None
    player.klaava -= pay
    loan.amountOwed -= pay
    if loan.amountOwed <= 0:
        loan.amountOwed = 0
        loan.status = "paid"
    db.commit()
    db.refresh(loan)
    return loan

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

def transferKlaava(db: Session, data: TransferRequest):
    loser = getPlayer(db, data.fromPlayerId)
    winner = getPlayer(db, data.toPlayerId)
    if not loser or not winner:
        return None

    loserPowerupTriggered = None
    winnerPowerupTriggered = None
    loserImmune = loser.powerup == "immunity"

    if not loserImmune and loser.klaava < data.amount:
        return None

    effectiveAmount, winnerPowerupTriggered = applyWinMultiplier(winner, data.amount)

    if loserImmune:
        loserPowerupTriggered = "immunity"
        loser.powerup = None
    else:
        loser.klaava -= effectiveAmount

    winner.klaava += effectiveAmount

    session = getActiveSession(db)
    roundId = None
    if session:
        activeRound = db.query(Round).filter(
            Round.tournamentId == session.id,
            Round.status == "active"
        ).first()
        if activeRound:
            roundId = activeRound.id
    if not loserImmune:
        db.add(Transaction(playerId=loser.id, roundId=roundId, amount=-effectiveAmount, type="bet"))
    db.add(Transaction(playerId=winner.id, roundId=roundId, amount=effectiveAmount, type="bet"))
    if not loserImmune and loser.klaava < 0:
        loser.klaava = 0
    if not loserImmune:
        checkBankruptcy(db, loser)
    db.commit()
    db.refresh(loser)
    db.refresh(winner)
    return {
        "winner": winner,
        "loser": loser,
        "amount": effectiveAmount,
        "winnerPowerupTriggered": winnerPowerupTriggered,
        "loserPowerupTriggered": loserPowerupTriggered,
    }

def getActiveSession(db: Session):
    return db.query(Tournament).filter(Tournament.status == "active").order_by(Tournament.id.desc()).first()

def advanceGame(db: Session, data: GameAdvanceRequest):
    session = getActiveSession(db)
    if not session:
        return None
    if data.phase:
        session.currentPhase = data.phase
        if data.phase == "endRound":
            sessionPlayerIds = [
                tp.playerId
                for tp in db.query(TournamentPlayer).filter(
                    TournamentPlayer.tournamentId == session.id
                ).all()
            ]
            broke = db.query(Player).filter(
                Player.id.in_(sessionPlayerIds),
                Player.eliminated.is_(False),
                Player.klaava < session.currentMinBet,
            ).all()
            for player in broke:
                hasLoan = db.query(Loan).filter(
                    Loan.playerId == player.id,
                    Loan.status == "active"
                ).count() > 0
                if hasLoan:
                    player.eliminated = True
                    player.klaava = 0
    if data.nextRound:
        session.currentRound += 1
        sessionPlayerIds = [
            tp.playerId
            for tp in db.query(TournamentPlayer).filter(
                TournamentPlayer.tournamentId == session.id
            ).all()
        ]
        activeLoans = db.query(Loan).filter(
            Loan.playerId.in_(sessionPlayerIds),
            Loan.status == "active"
        ).all()
        for loan in activeLoans:
            loan.turnsActive += 1
            if loan.turnsActive >= LOAN_MAX_TURNS:
                loan.status = "defaulted"
                player = db.query(Player).filter(Player.id == loan.playerId).first()
                if player:
                    player.eliminated = True
            else:
                loan.amountOwed += calcInterest(loan)
        settings = getSettings(db)
        session.currentMinBet = round(session.currentMinBet * settings.betMultiplier)
        session.currentMaxBet = round(session.currentMaxBet * settings.betMultiplier)
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

def endGame(db: Session):
    session = getActiveSession(db)
    if not session:
        return None
    sessionPlayers = db.query(TournamentPlayer).filter(
        TournamentPlayer.tournamentId == session.id
    ).all()
    players = [sp.player for sp in sessionPlayers if sp.player is not None]
    active = sorted([p for p in players if not p.eliminated], key=lambda p: p.klaava, reverse=True)
    eliminated = sorted([p for p in players if p.eliminated], key=lambda p: p.klaava, reverse=True)
    for i, player in enumerate(active + eliminated):
        db.add(Leaderboard(
            tournamentId=session.id,
            playerId=player.id,
            finalPosition=i + 1,
            finalKlaava=player.klaava,
        ))
    session.status = "finished"
    session.currentPhase = "finished"
    db.commit()
    entries = db.query(Leaderboard).filter(
        Leaderboard.tournamentId == session.id
    ).order_by(Leaderboard.finalPosition).all()
    return {"session": session, "leaderboard": entries}

def getLeaderboard(db: Session, sessionId: int):
    return db.query(Leaderboard).filter(
        Leaderboard.tournamentId == sessionId
    ).order_by(Leaderboard.finalPosition).all()

def getLastFinishedSession(db: Session):
    return db.query(Tournament).filter(
        Tournament.status == "finished"
    ).order_by(Tournament.id.desc()).first()

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

DEFAULT_GAMES = ["Hi-Lo", "Blackjack", "Roulette", "Auction", "Ravit"]

def getGames(db: Session):
    games = db.query(Game).all()
    if not games:
        for name in DEFAULT_GAMES:
            db.add(Game(name=name, isActive=True))
        db.commit()
        games = db.query(Game).all()
    return games

def createGame(db: Session, data: GameCreate):
    game = Game(**data.model_dump())
    db.add(game)
    db.commit()
    db.refresh(game)
    return game

def deleteGame(db: Session, gameId: int):
    game = db.query(Game).filter(Game.id == gameId).first()
    if not game:
        return None
    db.delete(game)
    db.commit()
    return game

def resetAllGames(db: Session):
    db.query(Game).update({"isActive": True})
    db.commit()

def toggleGame(db: Session, gameId: int):
    game = db.query(Game).filter(Game.id == gameId).first()
    if not game:
        return None
    game.isActive = not game.isActive
    db.commit()
    db.refresh(game)
    return game

def addPlayerToSession(db: Session, playerId: int):
    session = getActiveSession(db)
    if not session:
        return None
    player = getPlayer(db, playerId)
    if not player or player.eliminated:
        return None
    already = db.query(TournamentPlayer).filter(
        TournamentPlayer.tournamentId == session.id,
        TournamentPlayer.playerId == playerId,
    ).first()
    if already:
        return None
    settings = getSettings(db)
    player.klaava = settings.startingKlaava
    db.add(TournamentPlayer(tournamentId=session.id, playerId=playerId))
    db.commit()
    db.refresh(session)
    return session

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