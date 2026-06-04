def testGetPlayersEmpty(client):
    res = client.get("/players/")
    assert res.status_code == 200
    assert res.json() == []

def testCreatePlayer(client):
    res = client.post("/players/", json={"name": "test1", "klaava": 500})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "test1"
    assert data["klaava"] == 500
    assert data["eliminated"] == False
    assert "id" in data

def testGetPlayer(client):
    created = client.post("/players/", json={"name": "test2"}).json()
    res = client.get(f"/players/{created['id']}")
    assert res.status_code == 200
    assert res.json()["name"] == "test2"

def testGetPlayerNotFound(client):
    res = client.get("/players/999")
    assert res.status_code == 404

def testUpdatePlayer(client):
    created = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    res = client.put(f"/players/{created['id']}", json={"klaava": 300})
    assert res.status_code == 200
    assert res.json()["klaava"] == 300
    assert res.json()["name"] == "test1"

def testUpdatePlayerNotFound(client):
    res = client.put("/players/999", json={"klaava": 100})
    assert res.status_code == 404

def testDeletePlayer(client):
    created = client.post("/players/", json={"name": "test1"}).json()
    res = client.delete(f"/players/{created['id']}")
    assert res.status_code == 200
    assert client.get(f"/players/{created['id']}").status_code == 404

def testDeletePlayerNotFound(client):
    res = client.delete("/players/999")
    assert res.status_code == 404

def testCreatePlayerDefaultKlaava(client):
    res = client.post("/players/", json={"name": "test1"})
    assert res.json()["klaava"] == 500

def testCreatePlayerUsesSettingsStartingKlaava(client):
    client.put("/settings/", json={"startingKlaava": 999})
    res = client.post("/players/", json={"name": "test1"})
    assert res.json()["klaava"] == 999

def testCreatePlayerExplicitKlaavaOverridesSettings(client):
    client.put("/settings/", json={"startingKlaava": 999})
    res = client.post("/players/", json={"name": "test1", "klaava": 200})
    assert res.json()["klaava"] == 200

def testCreatePlayerWithRfid(client):
    res = client.post("/players/", json={"name": "test1", "rfid": "AA:BB:CC:01"})
    assert res.json()["rfid"] == "AA:BB:CC:01"
