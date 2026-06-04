def reset(client):
    client.post("/auction/reset")


# --- Items list ---

def testAuctionItemsReturnsAll(client):
    res = client.get("/auction/items")
    assert res.status_code == 200
    ids = [i["id"] for i in res.json()]
    assert set(ids) == {"heist", "immunity", "jackpot", "tax", "swap"}

def testAuctionItemsHaveRequiredFields(client):
    items = client.get("/auction/items").json()
    for item in items:
        assert "id" in item
        assert "name" in item
        assert "description" in item
        assert "passive" in item


# --- Start ---

def testAuctionStartOpens(client):
    reset(client)
    res = client.post("/auction/start", json={"itemId": "heist"})
    assert res.status_code == 200
    state = res.json()
    assert state["status"] == "open"
    assert state["item"]["id"] == "heist"
    assert state["bids"] == []
    reset(client)

def testAuctionStartUnknownItemFails(client):
    reset(client)
    res = client.post("/auction/start", json={"itemId": "nonexistent"})
    assert res.status_code == 404
    reset(client)


# --- Bidding ---

def testAuctionBidAppearsInState(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "immunity"})
    res = client.post("/auction/bid", json={"playerId": player["id"], "amount": 100})
    assert res.status_code == 200
    state = res.json()
    assert len(state["bids"]) == 1
    assert state["bids"][0]["playerId"] == player["id"]
    assert state["bids"][0]["amount"] == 100
    reset(client)

def testAuctionBidsSortedHighestFirst(client):
    reset(client)
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "jackpot"})
    client.post("/auction/bid", json={"playerId": p1["id"], "amount": 100})
    client.post("/auction/bid", json={"playerId": p2["id"], "amount": 300})
    state = client.get("/auction/state").json()
    assert state["bids"][0]["playerId"] == p2["id"]
    assert state["bids"][1]["playerId"] == p1["id"]
    reset(client)

def testAuctionBidMustExceedCurrentTop(client):
    reset(client)
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "tax"})
    client.post("/auction/bid", json={"playerId": p1["id"], "amount": 200})
    res = client.post("/auction/bid", json={"playerId": p2["id"], "amount": 150})
    assert res.status_code == 400
    reset(client)

def testAuctionBidCannotExceedPlayerKlaava(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 100}).json()
    client.post("/auction/start", json={"itemId": "swap"})
    res = client.post("/auction/bid", json={"playerId": player["id"], "amount": 200})
    assert res.status_code == 400
    reset(client)

def testAuctionBidMustBePositive(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "heist"})
    res = client.post("/auction/bid", json={"playerId": player["id"], "amount": 0})
    assert res.status_code == 400
    reset(client)

def testAuctionPlayerCanRaiseBid(client):
    reset(client)
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "immunity"})
    client.post("/auction/bid", json={"playerId": p1["id"], "amount": 100})
    client.post("/auction/bid", json={"playerId": p2["id"], "amount": 200})
    # p1 raises above p2
    res = client.post("/auction/bid", json={"playerId": p1["id"], "amount": 300})
    assert res.status_code == 200
    state = res.json()
    assert state["bids"][0]["playerId"] == p1["id"]
    # p1 only has one bid entry (replaced)
    p1_bids = [b for b in state["bids"] if b["playerId"] == p1["id"]]
    assert len(p1_bids) == 1
    reset(client)

def testAuctionCannotBidWhenIdle(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    res = client.post("/auction/bid", json={"playerId": player["id"], "amount": 100})
    assert res.status_code == 400


# --- End ---

def testAuctionEndAssignsItemToWinner(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "swap"})
    client.post("/auction/bid", json={"playerId": player["id"], "amount": 150})
    res = client.post("/auction/end")
    assert res.status_code == 200
    state = res.json()
    assert state["status"] == "finished"
    assert state["winner"]["playerId"] == player["id"]
    assert state["winner"]["item"]["id"] == "swap"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["powerup"] == "swap"
    reset(client)

def testAuctionEndDeductsFromWinner(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "heist"})
    client.post("/auction/bid", json={"playerId": player["id"], "amount": 150})
    client.post("/auction/end")
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 350
    reset(client)

def testAuctionEndHighestBidderWins(client):
    reset(client)
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "immunity"})
    client.post("/auction/bid", json={"playerId": p1["id"], "amount": 100})
    client.post("/auction/bid", json={"playerId": p2["id"], "amount": 250})
    res = client.post("/auction/end")
    state = res.json()
    assert state["winner"]["playerId"] == p2["id"]
    # only winner pays
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    assert p1data["klaava"] == 500
    assert p2data["klaava"] == 250
    reset(client)

def testAuctionEndNoBidsHasNoWinner(client):
    reset(client)
    client.post("/auction/start", json={"itemId": "tax"})
    res = client.post("/auction/end")
    assert res.status_code == 200
    state = res.json()
    assert state["status"] == "finished"
    assert state["winner"] is None
    reset(client)

def testAuctionCannotEndWhenIdle(client):
    reset(client)
    res = client.post("/auction/end")
    assert res.status_code == 400

def testAuctionWinnerAlreadyHasItemFails(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"powerup": "shield"})
    client.post("/auction/start", json={"itemId": "heist"})
    client.post("/auction/bid", json={"playerId": player["id"], "amount": 100})
    res = client.post("/auction/end")
    assert res.status_code == 400
    reset(client)


# --- Reset ---

def testAuctionResetClearsState(client):
    reset(client)
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/auction/start", json={"itemId": "jackpot"})
    client.post("/auction/bid", json={"playerId": player["id"], "amount": 100})
    res = client.post("/auction/reset")
    state = res.json()
    assert state["status"] == "idle"
    assert state["bids"] == []
    assert state["item"] is None
    assert state["winner"] is None
