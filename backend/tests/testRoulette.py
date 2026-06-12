from unittest.mock import patch


def testRouletteStartEntersBettingPhase(client):
    res = client.post("/roulette/start")
    assert res.status_code == 200
    assert res.json()["status"] == "betting"
    assert res.json()["bets"] == []


def testRoulettePlaceBet(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    res = client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "color",
        "betValue": "red",
        "amount": 50,
    })
    assert res.status_code == 200
    bets = res.json()
    assert len(bets) == 1
    assert bets[0]["playerId"] == player["id"]
    assert bets[0]["betValue"] == "red"


def testRouletteSpinRejectsIfNotInBettingPhase(client):
    res = client.post("/roulette/spin")
    assert res.status_code == 400


def testRouletteColorBetWin(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "color",
        "betValue": "red",
        "amount": 50,
    })
    with patch("random.randint", return_value=1):  # 1 is red
        res = client.post("/roulette/spin")
    data = res.json()
    assert data["result"] == 1
    assert data["resultColor"] == "red"
    bet = data["bets"][0]
    assert bet["result"] == "win"
    assert bet["payout"] == 50
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 550


def testRouletteColorBetLose(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "color",
        "betValue": "red",
        "amount": 50,
    })
    with patch("random.randint", return_value=2):  # 2 is black
        res = client.post("/roulette/spin")
    assert res.json()["resultColor"] == "black"
    bet = res.json()["bets"][0]
    assert bet["result"] == "lose"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 450


def testRouletteParityBetWin(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "parity",
        "betValue": "odd",
        "amount": 50,
    })
    with patch("random.randint", return_value=7):  # 7 is odd
        res = client.post("/roulette/spin")
    bet = res.json()["bets"][0]
    assert bet["result"] == "win"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 550


def testRouletteParityBetLose(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "parity",
        "betValue": "even",
        "amount": 50,
    })
    with patch("random.randint", return_value=7):  # 7 is odd — even loses
        res = client.post("/roulette/spin")
    bet = res.json()["bets"][0]
    assert bet["result"] == "lose"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 450


def testRouletteNumberBetWinPays35x(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "number",
        "betValue": "17",
        "amount": 10,
    })
    with patch("random.randint", return_value=17):
        res = client.post("/roulette/spin")
    bet = res.json()["bets"][0]
    assert bet["result"] == "win"
    assert bet["payout"] == 350  # 10 * 35
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 850


def testRouletteZeroLosesColorBet(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "color",
        "betValue": "red",
        "amount": 50,
    })
    with patch("random.randint", return_value=0):  # green
        res = client.post("/roulette/spin")
    assert res.json()["resultColor"] == "green"
    assert res.json()["bets"][0]["result"] == "lose"


def testRouletteZeroLosesParityBet(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "parity",
        "betValue": "even",
        "amount": 50,
    })
    with patch("random.randint", return_value=0):  # 0 is a special loss for parity
        res = client.post("/roulette/spin")
    assert res.json()["bets"][0]["result"] == "lose"


def testRouletteShieldBlocksLoss(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"powerup": "shield"})
    client.post("/roulette/start")
    client.post("/roulette/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "betType": "color",
        "betValue": "red",
        "amount": 50,
    })
    with patch("random.randint", return_value=2):  # black — lose
        res = client.post("/roulette/spin")
    bet = res.json()["bets"][0]
    assert bet["powerupTriggered"] == "shield"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 500  # shield blocked the loss
    assert updated["powerup"] is None  # shield consumed


def testRouletteReset(client):
    client.post("/roulette/start")
    res = client.post("/roulette/reset")
    assert res.json()["status"] == "idle"
    assert res.json()["bets"] == []
    assert res.json()["result"] is None
