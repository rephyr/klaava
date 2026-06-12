from unittest.mock import patch


def _card(value, suit="♠"):
    labels = {1: "A", 11: "J", 12: "Q", 13: "K"}
    return {
        "value": value,
        "suit": suit,
        "label": labels.get(value, str(value)),
        "red": suit in {"♥", "♦"},
    }


def testHiLoStartSetsWaitingStatus(client):
    res = client.post("/hiLo/start")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "waiting"
    assert data["currentCard"] is not None
    assert data["bets"] == []


def testHiLoPlaceBet(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.post("/hiLo/start")
    res = client.post("/hiLo/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "guess": "higher",
        "amount": 50,
    })
    assert res.status_code == 200
    bets = res.json()
    assert len(bets) == 1
    assert bets[0]["guess"] == "higher"


def testHiLoRevealRejectsIfNotWaiting(client):
    res = client.post("/hiLo/reveal")
    assert res.status_code == 400


def testHiLoCorrectHigherGuess(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    # deck = [card_A, card_B]; start pops card_B as currentCard, reveal pops card_A
    # card_A(9) > card_B(5) → result "higher"
    with patch("routers.hiLo.makeDeck", return_value=[_card(9), _card(5)]):
        client.post("/hiLo/start")
    client.post("/hiLo/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "guess": "higher",
        "amount": 50,
    })
    res = client.post("/hiLo/reveal")
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "higher"
    bet = next(b for b in data["bets"] if b["playerId"] == player["id"])
    assert bet["result"] == "correct"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 550


def testHiLoCorrectLowerGuess(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    # card_A(3) < card_B(9) → result "lower"
    with patch("routers.hiLo.makeDeck", return_value=[_card(3), _card(9)]):
        client.post("/hiLo/start")
    client.post("/hiLo/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "guess": "lower",
        "amount": 50,
    })
    res = client.post("/hiLo/reveal")
    data = res.json()
    assert data["result"] == "lower"
    assert data["bets"][0]["result"] == "correct"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 550


def testHiLoWrongGuessLosesKlaava(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    # card_A(3) < card_B(9) → result "lower", but player guesses "higher"
    with patch("routers.hiLo.makeDeck", return_value=[_card(3), _card(9)]):
        client.post("/hiLo/start")
    client.post("/hiLo/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "guess": "higher",
        "amount": 50,
    })
    res = client.post("/hiLo/reveal")
    data = res.json()
    assert data["bets"][0]["result"] == "wrong"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 450


def testHiLoEqualResult(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    # card_A(7) == card_B(7) → result "equal"
    with patch("routers.hiLo.makeDeck", return_value=[_card(7, "♥"), _card(7)]):
        client.post("/hiLo/start")
    client.post("/hiLo/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "guess": "higher",
        "amount": 50,
    })
    res = client.post("/hiLo/reveal")
    assert res.json()["result"] == "equal"
    assert res.json()["bets"][0]["result"] == "wrong"


def testHiLoNextRoundClearsBets(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    with patch("routers.hiLo.makeDeck", return_value=[_card(9), _card(5)]):
        client.post("/hiLo/start")
    client.post("/hiLo/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "guess": "higher",
        "amount": 50,
    })
    client.post("/hiLo/reveal")
    res = client.post("/hiLo/next")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "waiting"
    assert data["bets"] == []


def testHiLoNextRejectsIfNotRevealed(client):
    client.post("/hiLo/start")
    res = client.post("/hiLo/next")
    assert res.status_code == 400


def testHiLoShieldBlocksLoss(client):
    player = client.post("/players/", json={"name": "p1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"powerup": "shield"})
    # card_A(3) < card_B(9) → "lower"; player guesses "higher" → wrong
    with patch("routers.hiLo.makeDeck", return_value=[_card(3), _card(9)]):
        client.post("/hiLo/start")
    client.post("/hiLo/bet", json={
        "playerId": player["id"],
        "playerName": "p1",
        "guess": "higher",
        "amount": 50,
    })
    res = client.post("/hiLo/reveal")
    bet = res.json()["bets"][0]
    assert bet["powerupTriggered"] == "shield"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 500  # shield blocked the loss
    assert updated["powerup"] is None  # shield consumed


def testHiLoReset(client):
    client.post("/hiLo/start")
    res = client.post("/hiLo/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "idle"
    assert data["currentCard"] is None
    assert data["bets"] == []
