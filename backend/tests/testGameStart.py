def testStartGameReturnsSession(client):
    p1 = client.post("/players/", json={"name": "Janne"}).json()
    p2 = client.post("/players/", json={"name": "Sara"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "active"
    assert data["currentPhase"] == "gambling"
    assert data["currentRound"] == 1
    assert data["currentLevel"] == 1
    assert len(data["players"]) == 2

def testStartGameUsesSettingsStake(client):
    client.put("/settings/", json={"initialStake": 100})
    p1 = client.post("/players/", json={"name": "Janne"}).json()
    p2 = client.post("/players/", json={"name": "Sara"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.json()["currentStake"] == 100

def testStartGameUsesSettingsMode(client):
    client.put("/settings/", json={"gameMode": "sit_and_go"})
    p1 = client.post("/players/", json={"name": "Janne"}).json()
    p2 = client.post("/players/", json={"name": "Sara"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.json()["mode"] == "sit_and_go"

def testStartGameModeOverridesSettings(client):
    client.put("/settings/", json={"gameMode": "sit_and_go"})
    p1 = client.post("/players/", json={"name": "Janne"}).json()
    p2 = client.post("/players/", json={"name": "Sara"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]], "mode": "tournament"})
    assert res.json()["mode"] == "tournament"

def testStartGameRejectsEmptyPlayerList(client):
    res = client.post("/game/start", json={"playerIds": []})
    assert res.status_code == 400

def testStartGameRejectsInvalidPlayerId(client):
    res = client.post("/game/start", json={"playerIds": [999]})
    assert res.status_code == 400

def testStartGameRejectsEliminatedPlayer(client):
    p1 = client.post("/players/", json={"name": "Janne"}).json()
    client.put(f"/players/{p1['id']}", json={"eliminated": True})
    res = client.post("/game/start", json={"playerIds": [p1["id"]]})
    assert res.status_code == 400

def testGameStateReflectsActiveSession(client):
    p1 = client.post("/players/", json={"name": "Janne"}).json()
    p2 = client.post("/players/", json={"name": "Sara"}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    state = client.get("/game").json()
    assert state["phase"] == "gambling"
    assert state["round"] == 1
    assert state["sessionId"] is not None

def testGameStateIsLobbyWithNoSession(client):
    state = client.get("/game").json()
    assert state["phase"] == "lobby"
    assert state["sessionId"] is None
