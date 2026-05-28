from database.connection import SessionLocal, engine
from database.models import Base, Player

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        if db.query(Player).first():
            print("Already seeded, skipping.")
            return
        players = [
            Player(name="Janne",  klaava=500, rfid="AA:BB:CC:01"),
            Player(name="Mikael", klaava=500, rfid="AA:BB:CC:02"),
            Player(name="Sara",   klaava=500, rfid="AA:BB:CC:03"),
            Player(name="Joona",  klaava=500, rfid="AA:BB:CC:04"),
        ]
        db.add_all(players)
        db.commit()
        print("Seeded 4 players.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
