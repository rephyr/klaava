def _startGame(client, rounds=5):
    client.put("/settings/", json={"totalRounds": rounds})
    p1 = client.post("/players/", json={"name": "p1"}).json()
    p2 = client.post("/players/", json={"name": "p2"}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})

def testAdvanceRoundIncrementsCounter(client):
    _startGame(client)
    res = client.post("/game/advance", json={"nextRound": True, "phase": "wheel"})
    assert res.json()["round"] == 2

def testAdvanceRoundPreservesTotalRounds(client):
    _startGame(client, rounds=5)
    res = client.post("/game/advance", json={"nextRound": True, "phase": "wheel"})
    assert res.json()["totalRounds"] == 5

def testThreeRoundsReachRoundThree(client):
    _startGame(client, rounds=5)
    client.post("/game/advance", json={"nextRound": True, "phase": "wheel"})
    res = client.post("/game/advance", json={"nextRound": True, "phase": "wheel"})
    assert res.json()["round"] == 3

def testGameStateReflectsRoundAfterAdvance(client):
    _startGame(client, rounds=5)
    client.post("/game/advance", json={"nextRound": True, "phase": "wheel"})
    state = client.get("/game").json()
    assert state["round"] == 2
    assert state["totalRounds"] == 5

def testDefaultTotalRoundsIsFive(client):
    p1 = client.post("/players/", json={"name": "p1"}).json()
    p2 = client.post("/players/", json={"name": "p2"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.json()["totalRounds"] == 5

def testDefaultGamblingRoundsIsThree(client):
    p1 = client.post("/players/", json={"name": "p1"}).json()
    p2 = client.post("/players/", json={"name": "p2"}).json()
    res = client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    assert res.json()["gamblingRounds"] == 3

def testGamblingRoundsFrozenAtGameStart(client):
    client.put("/settings/", json={"gamblingRounds": 5})
    p1 = client.post("/players/", json={"name": "p1"}).json()
    p2 = client.post("/players/", json={"name": "p2"}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    client.put("/settings/", json={"gamblingRounds": 99})
    state = client.get("/game").json()
    assert state["gamblingRounds"] == 5
