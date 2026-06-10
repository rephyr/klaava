from unittest.mock import patch

def buyItem(client, playerId, itemId):
    return client.post("/shop/buy", json={"playerId": playerId, "powerupId": itemId}).json()

def startSession(client, playerIds):
    client.post("/game/start", json={"playerIds": playerIds})


# --- Double Down ---

def testDoubleDownDoublesTransferWin(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    startSession(client, [p1["id"], p2["id"]])
    buyItem(client, p1["id"], "doubleDown")
    client.post("/game/transfer", json={"fromPlayerId": p2["id"], "toPlayerId": p1["id"], "amount": 100})
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    # test1: 500 - 150 (buy) + 200 (100*2 doubled win) = 550
    # test2: 500 - 200 = 300
    assert p1data["klaava"] == 550
    assert p2data["klaava"] == 300

def testDoubleDownIsConsumedAfterWin(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    startSession(client, [p1["id"], p2["id"]])
    buyItem(client, p1["id"], "doubleDown")
    client.post("/game/transfer", json={"fromPlayerId": p2["id"], "toPlayerId": p1["id"], "amount": 50})
    p1data = client.get(f"/players/{p1['id']}").json()
    assert p1data["powerup"] is None

def testDoubleDownDoublesDoubleOrNothingWin(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    buyItem(client, player["id"], "doubleDown")
    with patch("random.random", return_value=0.3):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 100})
    result = res.json()["results"][0]
    # Bought for 150 → 350, wins 100*2=200 → 550
    assert result["klaava"] == 550
    assert result["amount"] == 200


# --- Shield ---

def testShieldNotTriggeredInLastRoll(client):
    # Minigames are house-funded — losers don't lose klaava, so shield is not consumed
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    startSession(client, [p1["id"], p2["id"]])
    buyItem(client, p2["id"], "shield")
    with patch("random.randint", side_effect=[6, 1]):
        client.post("/minigame/lastRoll")
    p2data = client.get(f"/players/{p2['id']}").json()
    assert p2data["klaava"] == 375  # paid for shield; no loss deducted
    assert p2data["powerup"] == "shield"  # not consumed — nothing to block

def testShieldNotTriggeredInDoubleOrNothing(client):
    # Minigames are house-funded — no loss to block
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    buyItem(client, player["id"], "shield")
    with patch("random.random", return_value=0.7):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 100})
    result = res.json()["results"][0]
    assert result["klaava"] == 375  # paid for shield; no loss
    assert result["powerupTriggered"] is None
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["powerup"] == "shield"  # not consumed


# --- Steal ---

def testStealTakesMinBetFromTarget(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    startSession(client, [p1["id"], p2["id"]])
    buyItem(client, p1["id"], "steal")
    client.post("/shop/use", json={"playerId": p1["id"], "targetId": p2["id"]})
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    # test1: 500 - 100 (buy) + 50 (minBet stolen) = 450
    assert p1data["klaava"] == 450
    assert p2data["klaava"] == 450
    assert p1data["powerup"] is None

def testStealRequiresTarget(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    buyItem(client, player["id"], "steal")
    res = client.post("/shop/use", json={"playerId": player["id"]})
    assert res.status_code == 400

def testStealCannotExceedTargetKlaava(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 10}).json()
    client.put("/settings/", json={"minBet": 200})
    startSession(client, [p1["id"], p2["id"]])
    buyItem(client, p1["id"], "steal")
    client.post("/shop/use", json={"playerId": p1["id"], "targetId": p2["id"]})
    p2data = client.get(f"/players/{p2['id']}").json()
    assert p2data["klaava"] == 0


# --- Sabotage ---

def testSabotageRemovesTargetItem(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    startSession(client, [p1["id"], p2["id"]])
    buyItem(client, p1["id"], "sabotage")
    buyItem(client, p2["id"], "shield")
    client.post("/shop/use", json={"playerId": p1["id"], "targetId": p2["id"]})
    p2data = client.get(f"/players/{p2['id']}").json()
    assert p2data["powerup"] is None

def testPassiveItemCannotBeManuallyUsed(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    buyItem(client, player["id"], "shield")
    res = client.post("/shop/use", json={"playerId": player["id"]})
    assert res.status_code == 400


# --- Immunity ---

def testImmunityBlocksTransferLoss(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.put(f"/players/{p2['id']}", json={"powerup": "immunity"})
    client.post("/game/transfer", json={"fromPlayerId": p2["id"], "toPlayerId": p1["id"], "amount": 100})
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    # p2 immune — pays nothing; p1 receives 100 from house
    assert p2data["klaava"] == 500
    assert p1data["klaava"] == 600

def testImmunityIsConsumedAfterBlock(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.put(f"/players/{p2['id']}", json={"powerup": "immunity"})
    client.post("/game/transfer", json={"fromPlayerId": p2["id"], "toPlayerId": p1["id"], "amount": 100})
    p2data = client.get(f"/players/{p2['id']}").json()
    assert p2data["powerup"] is None

def testImmunityNotTriggeredInDoubleOrNothing(client):
    # Minigames are house-funded — no loss to block with immunity
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"powerup": "immunity"})
    with patch("random.random", return_value=0.7):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 100})
    result = res.json()["results"][0]
    assert result["klaava"] == 500  # unchanged
    assert result["powerupTriggered"] is None
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["powerup"] == "immunity"  # not consumed

def testImmunityNotTriggeredInLastRoll(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    startSession(client, [p1["id"], p2["id"]])
    client.put(f"/players/{p2['id']}", json={"powerup": "immunity"})
    with patch("random.randint", side_effect=[6, 1]):
        res = client.post("/minigame/lastRoll")
    results = {r["playerId"]: r for r in res.json()["results"]}
    assert results[p2["id"]]["powerupTriggered"] is None
    assert results[p2["id"]]["klaava"] == 500  # unchanged
    p2data = client.get(f"/players/{p2['id']}").json()
    assert p2data["klaava"] == 500
    assert p2data["powerup"] == "immunity"  # not consumed — nothing to block


# --- Jackpot ---

def testJackpotTriplesTransferWin(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.put(f"/players/{p1['id']}", json={"powerup": "jackpot"})
    client.post("/game/transfer", json={"fromPlayerId": p2["id"], "toPlayerId": p1["id"], "amount": 100})
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    # p1 receives 100*3=300; p2 pays 300
    assert p1data["klaava"] == 800
    assert p2data["klaava"] == 200

def testJackpotIsConsumedAfterWin(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    client.put(f"/players/{p1['id']}", json={"powerup": "jackpot"})
    client.post("/game/transfer", json={"fromPlayerId": p2["id"], "toPlayerId": p1["id"], "amount": 100})
    p1data = client.get(f"/players/{p1['id']}").json()
    assert p1data["powerup"] is None

def testJackpotTriplesDoubleOrNothingWin(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"powerup": "jackpot"})
    with patch("random.random", return_value=0.3):
        res = client.post("/minigame/doubleOrNothing", json={"playerIds": [player["id"]], "amount": 100})
    result = res.json()["results"][0]
    # wins 100*3=300 → 800
    assert result["klaava"] == 800
    assert result["amount"] == 300
    assert result["powerupTriggered"] == "jackpot"


# --- Heist ---

def testHeistStealsHalfOfTargetKlaava(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 400}).json()
    client.put(f"/players/{p1['id']}", json={"powerup": "heist"})
    client.post("/shop/use", json={"playerId": p1["id"], "targetId": p2["id"]})
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    # p2 loses 200 (half of 400); p1 gains 200
    assert p1data["klaava"] == 700
    assert p2data["klaava"] == 200
    assert p1data["powerup"] is None

def testHeistRequiresTarget(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"powerup": "heist"})
    res = client.post("/shop/use", json={"playerId": player["id"]})
    assert res.status_code == 400


# --- Tax ---

def testTaxCollectsMinBetFromAllActivePlayers(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 500}).json()
    p3 = client.post("/players/", json={"name": "test3", "klaava": 500}).json()
    startSession(client, [p1["id"], p2["id"], p3["id"]])
    client.put(f"/players/{p1['id']}", json={"powerup": "tax"})
    client.post("/shop/use", json={"playerId": p1["id"]})
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    p3data = client.get(f"/players/{p3['id']}").json()
    # default minBet=50; p1 collects 50+50=100
    assert p1data["klaava"] == 600
    assert p2data["klaava"] == 450
    assert p3data["klaava"] == 450
    assert p1data["powerup"] is None


# --- Swap ---

def testSwapExchangesKlaava(client):
    p1 = client.post("/players/", json={"name": "test1", "klaava": 200}).json()
    p2 = client.post("/players/", json={"name": "test2", "klaava": 800}).json()
    client.put(f"/players/{p1['id']}", json={"powerup": "swap"})
    client.post("/shop/use", json={"playerId": p1["id"], "targetId": p2["id"]})
    p1data = client.get(f"/players/{p1['id']}").json()
    p2data = client.get(f"/players/{p2['id']}").json()
    assert p1data["klaava"] == 800
    assert p2data["klaava"] == 200
    assert p1data["powerup"] is None

def testSwapRequiresTarget(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.put(f"/players/{player['id']}", json={"powerup": "swap"})
    res = client.post("/shop/use", json={"playerId": player["id"]})
    assert res.status_code == 400
