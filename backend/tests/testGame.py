def testGetGameState(client):
    res = client.get("/game")
    assert res.status_code == 200
    data = res.json()
    assert "phase" in data
    assert "round" in data
    assert "level" in data
    assert "minBet" in data
    assert "maxBet" in data
    assert "betMultiplier" in data

def testGameStateReflectsSettings(client):
    client.put("/settings/", json={"minBet": 100, "maxBet": 400, "gameMode": "sit_and_go"})
    data = client.get("/game").json()
    assert data["minBet"] == 100
    assert data["maxBet"] == 400
    assert data["gameMode"] == "sit_and_go"

def testCreateTournament(client):
    res = client.post("/tournaments", json={"mode": "tournament"})
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "tournament"
    assert data["status"] == "lobby"
    assert "id" in data

def testCreateTournamentSitAndGo(client):
    res = client.post("/tournaments", json={"mode": "sit_and_go"})
    assert res.status_code == 200
    assert res.json()["mode"] == "sit_and_go"

def testGetTournament(client):
    created = client.post("/tournaments", json={"mode": "tournament"}).json()
    res = client.get(f"/tournaments/{created['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]

def testGetTournamentNotFound(client):
    res = client.get("/tournaments/999")
    assert res.status_code == 404
