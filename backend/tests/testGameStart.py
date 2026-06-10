def testStartGameReturnsSession(client):
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "active"
    assert data["currentPhase"] == "gambling"
    assert data["currentRound"] == 1
    assert data["currentLevel"] == 1
    assert len(data["players"]) == 2

def testStartGameUsesSettingsBets(client):
    client.put("/settings/", json={"minBet": 100, "maxBet": 400})
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.json()["currentMinBet"] == 100
    assert res.json()["currentMaxBet"] == 400

def testStartGameUsesSettingsMode(client):
    client.put("/settings/", json={"gameMode": "sit_and_go"})
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.json()["mode"] == "sit_and_go"

def testStartGameModeOverridesSettings(client):
    client.put("/settings/", json={"gameMode": "sit_and_go"})
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]], "mode": "tournament"})
    assert res.json()["mode"] == "tournament"

def testStartGameRejectsEmptyPlayerList(client):
    res = client.post("/game/start", json={"playerIds": []})
    assert res.status_code == 400

def testStartGameRejectsInvalidPlayerId(client):
    res = client.post("/game/start", json={"playerIds": [999]})
    assert res.status_code == 400

def testStartGameRejectsEliminatedPlayer(client):
    p1 = client.post("/players/", json={"name": "test1"}).json()
    client.put(f"/players/{p1['id']}", json={"eliminated": True})
    res = client.post("/game/start", json={"playerIds": [p1["id"]]})
    assert res.status_code == 400

def testNextLevelMultipliesBets(client):
    client.put("/settings/", json={"minBet": 50, "maxBet": 200, "betMultiplier": 2.0})
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    res = client.post("/game/advance", json={"nextLevel": True})
    assert res.json()["minBet"] == 100
    assert res.json()["maxBet"] == 400

def testGameStateReflectsActiveSession(client):
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    state = client.get("/game").json()
    assert state["phase"] == "gambling"
    assert state["round"] == 1
    assert state["sessionId"] is not None

def testGameStateIsLobbyWithNoSession(client):
    state = client.get("/game").json()
    assert state["phase"] == "lobby"
    assert state["sessionId"] is None

def testStartGameInheritsTotalRounds(client):
    client.put("/settings/", json={"totalRounds": 5})
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.json()["totalRounds"] == 5

def testGameStateIncludesTotalRounds(client):
    client.put("/settings/", json={"totalRounds": 4})
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    state = client.get("/game").json()
    assert state["totalRounds"] == 4

def testLobbyStateIncludesTotalRoundsFromSettings(client):
    client.put("/settings/", json={"totalRounds": 2})
    state = client.get("/game").json()
    assert state["totalRounds"] == 2

def testTotalRoundsFrozenAtGameStart(client):
    client.put("/settings/", json={"totalRounds": 3})  # explicit — not testing default
    p1 = client.post("/players/", json={"name": "test1"}).json()
    p2 = client.post("/players/", json={"name": "test2"}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    client.put("/settings/", json={"totalRounds": 99})
    state = client.get("/game").json()
    assert state["totalRounds"] == 3
