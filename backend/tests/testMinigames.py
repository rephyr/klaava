from unittest.mock import patch

def testDoubleOrNothingWin(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    with patch("random.random", return_value=0.3):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 100})
    assert res.status_code == 200
    result = res.json()["results"][0]
    assert result["result"] == "win"
    assert result["klaava"] == 600
    assert result["amount"] == 100

def testDoubleOrNothingLose(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    with patch("random.random", return_value=0.7):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 100})
    result = res.json()["results"][0]
    assert result["result"] == "lose"
    assert result["klaava"] == 400

def testDoubleOrNothingCannotGoBelowZero(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 50}).json()
    with patch("random.random", return_value=0.7):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 200})
    result = res.json()["results"][0]
    assert result["klaava"] == 0
    assert result["amount"] == 50

def testDoubleOrNothingMultiplePlayers(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    with patch("random.random", side_effect=[0.3, 0.7]):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [p1["id"], p2["id"]], "amount": 100})
    results = {r["playerId"]: r for r in res.json()["results"]}
    assert results[p1["id"]]["result"] == "win"
    assert results[p2["id"]]["result"] == "lose"

def testDoubleOrNothingSkipsEliminatedPlayers(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"eliminated": True})
    res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 100})
    assert res.json()["results"] == []

def testLastRollTransfersFromLoserToWinner(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    with patch("random.randint", side_effect=[6, 1]):
        res = client.post("/minigame/lastRoll")
    assert res.status_code == 200
    results = {r["playerId"]: r for r in res.json()["results"]}
    assert results[p1["id"]]["outcome"] == "winner"
    assert results[p2["id"]]["outcome"] == "loser"
    assert results[p1["id"]]["klaava"] + results[p2["id"]]["klaava"] == 1000

def testLastRollNeutralPlayerUnchanged(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    p3 = client.post("/players/", json={"name": "test3", "klaava": 500}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"], p3["id"]]})
    with patch("random.randint", side_effect=[6, 3, 1]):
        res = client.post("/minigame/lastRoll")
    results = {r["playerId"]: r for r in res.json()["results"]}
    assert results[p2["id"]]["outcome"] == "neutral"
    assert results[p2["id"]]["klaava"] == 500

def testLastRollTieNoTransfer(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    with patch("random.randint", side_effect=[3, 3]):
        res = client.post("/minigame/lastRoll")
    results = res.json()["results"]
    assert all(r["outcome"] == "tie" for r in results)
    assert all(r["klaava"] == 500 for r in results)
    assert res.json()["amount"] == 0

def testLastRollRequiresActiveGame(client):
    res = client.post("/minigame/lastRoll")
    assert res.status_code == 400

def testLastRollAppearsInGameState(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.post("/game/start", json={"playerIds": [p1["id"], p2["id"]]})
    with patch("random.randint", side_effect=[6, 1]):
        client.post("/minigame/lastRoll")
    state = client.get("/game").json()
    assert state["minigame"] is not None
    assert state["minigame"]["type"] == "lastRoll"
