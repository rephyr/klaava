def testStartBlackjackDealsCards(client):
    p1 = client.post("/players/", json={"name": "Janne", "klaava": 500}).json()
    res = client.post("/blackjack/start", json={"bets": [{"playerId": p1["id"], "playerName": "Janne", "amount": 100}]})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "playing"
    assert len(data["players"][0]["hand"]) == 2
    assert len(data["dealer"]["hand"]) == 1
    assert data["dealer"]["hiddenCard"] is not None
    client.post("/blackjack/reset")

def testStandAndDealerPlays(client):
    p1 = client.post("/players/", json={"name": "Janne", "klaava": 500}).json()
    client.post("/blackjack/start", json={"bets": [{"playerId": p1["id"], "playerName": "Janne", "amount": 100}]})
    client.post("/blackjack/stand", json={"playerId": p1["id"]})
    res = client.post("/blackjack/dealer")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "finished"
    assert data["players"][0]["result"] in ("win", "lose", "push")
    client.post("/blackjack/reset")

def testWinAddsKlaava(client):
    p1 = client.post("/players/", json={"name": "Janne", "klaava": 500}).json()
    # Force a win: set player to high total via multiple hits then stand
    # We can't control cards, so just test that klaava changes after dealer plays
    client.post("/blackjack/start", json={"bets": [{"playerId": p1["id"], "playerName": "Janne", "amount": 100}]})
    client.post("/blackjack/stand", json={"playerId": p1["id"]})
    client.post("/blackjack/dealer")
    updated = client.get(f"/players/{p1['id']}").json()
    state = client.get("/blackjack/state").json()
    result = state["players"][0]["result"]
    if result == "win":
        assert updated["klaava"] == 600
    elif result == "lose":
        assert updated["klaava"] == 400
    elif result == "push":
        assert updated["klaava"] == 500
    client.post("/blackjack/reset")

def testBlackjackPays3to2(client):
    p1 = client.post("/players/", json={"name": "Janne", "klaava": 500}).json()
    client.post("/blackjack/start", json={"bets": [{"playerId": p1["id"], "playerName": "Janne", "amount": 100}]})
    state = client.get("/blackjack/state").json()
    if state["players"][0]["status"] == "blackjack":
        client.post("/blackjack/dealer")
        updated = client.get(f"/players/{p1['id']}").json()
        assert updated["klaava"] == 650  # 500 + ceil(100 * 1.5)
    client.post("/blackjack/reset")

def testLoseDeductsKlaava(client):
    p1 = client.post("/players/", json={"name": "Janne", "klaava": 500}).json()
    # Bust by hitting until over 21 (loop until bust)
    client.post("/blackjack/start", json={"bets": [{"playerId": p1["id"], "playerName": "Janne", "amount": 100}]})
    for _ in range(10):
        state = client.get("/blackjack/state").json()
        if state["players"][0]["status"] != "active":
            break
        client.post("/blackjack/hit", json={"playerId": p1["id"]})
    state = client.get("/blackjack/state").json()
    if state["players"][0]["status"] == "bust":
        client.post("/blackjack/dealer")
        updated = client.get(f"/players/{p1['id']}").json()
        assert updated["klaava"] == 400
    client.post("/blackjack/reset")
