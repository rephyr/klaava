from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .connection import Base

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    klaava = Column(Integer, default=500)
    rfid = Column(String, unique=True, nullable=True)
    eliminated = Column(Boolean, default=False)
    powerup = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())

    transactions = relationship("Transaction", back_populates="player")
    loans = relationship("Loan", back_populates="player")
    leaderboardEntries = relationship("Leaderboard", back_populates="player")

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String, nullable=False)  # sit_and_go | tournament
    status = Column(String, default="lobby")  # lobby | active | finished
    currentPhase = Column(String, default="lobby")  # lobby | gambling | minigame | bracket | finished
    currentRound = Column(Integer, default=0)
    currentLevel = Column(Integer, default=1)
    currentMinBet = Column(Integer, default=0)
    currentMaxBet = Column(Integer, default=0)
    totalRounds = Column(Integer, default=3)
    createdAt = Column(DateTime, server_default=func.now())

    rounds = relationship("Round", back_populates="tournament")
    leaderboardEntries = relationship("Leaderboard", back_populates="tournament")
    sessionPlayers = relationship("TournamentPlayer", back_populates="tournament")

class TournamentPlayer(Base):
    __tablename__ = "tournament_players"

    id = Column(Integer, primary_key=True, index=True)
    tournamentId = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    playerId = Column(Integer, ForeignKey("players.id"), nullable=False)
    active = Column(Boolean, default=True)

    tournament = relationship("Tournament", back_populates="sessionPlayers")
    player = relationship("Player")

class Round(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    tournamentId = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    roundNumber = Column(Integer, nullable=False)
    level = Column(Integer, nullable=False)
    minBet = Column(Integer, nullable=False)
    maxBet = Column(Integer, nullable=False)
    phase = Column(String, nullable=False)  # gambling | minigame
    status = Column(String, default="pending")  # pending | active | finished

    tournament = relationship("Tournament", back_populates="rounds")
    transactions = relationship("Transaction", back_populates="round")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    playerId = Column(Integer, ForeignKey("players.id"), nullable=False)
    roundId = Column(Integer, ForeignKey("rounds.id"), nullable=True)
    amount = Column(Integer, nullable=False)  # positive = gain, negative = loss
    type = Column(String, nullable=False)  # bet | powerup | transfer
    createdAt = Column(DateTime, server_default=func.now())

    player = relationship("Player", back_populates="transactions")
    round = relationship("Round", back_populates="transactions")

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    playerId = Column(Integer, ForeignKey("players.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    interestRate = Column(Float, nullable=False, default=0.10)
    amountOwed = Column(Integer, nullable=False)
    status = Column(String, default="active")  # active | paid | defaulted
    turnsActive = Column(Integer, default=0)
    createdAt = Column(DateTime, server_default=func.now())

    player = relationship("Player", back_populates="loans")

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, server_default=func.now())

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    startingKlaava = Column(Integer, default=500)
    minBet = Column(Integer, default=50)
    maxBet = Column(Integer, default=200)
    betMultiplier = Column(Float, default=2.0)
    loanInterestRate = Column(Float, default=0.10)
    maxLoanAmount = Column(Integer, default=200)
    gameMode = Column(String, default="tournament")  # sit_and_go | tournament
    totalRounds = Column(Integer, default=3)

class Leaderboard(Base):
    __tablename__ = "leaderboards"

    id = Column(Integer, primary_key=True, index=True)
    tournamentId = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    playerId = Column(Integer, ForeignKey("players.id"), nullable=False)
    finalPosition = Column(Integer, nullable=False)
    finalKlaava = Column(Integer, nullable=False)

    tournament = relationship("Tournament", back_populates="leaderboardEntries")
    player = relationship("Player", back_populates="leaderboardEntries")
