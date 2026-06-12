import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.connection import Base, getDb
from main import app
from routers import hiLo, blackjack, roulette, auction

TEST_DB_URL = "sqlite:///./testKlaava.db"
testEngine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=testEngine)

@pytest.fixture(autouse=True)
def setupDb():
    Base.metadata.create_all(bind=testEngine)
    hiLo.resetState()
    blackjack.resetState()
    roulette.resetState()
    auction.resetState()
    yield
    Base.metadata.drop_all(bind=testEngine)

@pytest.fixture
def client():
    def overrideGetDb():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[getDb] = overrideGetDb
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
