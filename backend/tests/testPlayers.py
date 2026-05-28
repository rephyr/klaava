def testGetPlayersEmpty(client):
    res = client.get("/players/")
    assert res.status_code == 200
    assert res.json() == []

def testCreatePlayer(client):
    res = client.post("/players/", json={"name": "Janne", "klaava": 500})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Janne"
    assert data["klaava"] == 500
    assert data["eliminated"] == False
    assert "id" in data

def testGetPlayer(client):
    created = client.post("/players/", json={"name": "Sara"}).json()
    res = client.get(f"/players/{created['id']}")
    assert res.status_code == 200
    assert res.json()["name"] == "Sara"

def testGetPlayerNotFound(client):
    res = client.get("/players/999")
    assert res.status_code == 404

def testUpdatePlayer(client):
    created = client.post("/players/", json={"name": "Mikael", "klaava": 500}).json()
    res = client.put(f"/players/{created['id']}", json={"klaava": 300})
    assert res.status_code == 200
    assert res.json()["klaava"] == 300
    assert res.json()["name"] == "Mikael"

def testUpdatePlayerNotFound(client):
    res = client.put("/players/999", json={"klaava": 100})
    assert res.status_code == 404

def testDeletePlayer(client):
    created = client.post("/players/", json={"name": "Joona"}).json()
    res = client.delete(f"/players/{created['id']}")
    assert res.status_code == 200
    assert client.get(f"/players/{created['id']}").status_code == 404

def testDeletePlayerNotFound(client):
    res = client.delete("/players/999")
    assert res.status_code == 404

def testCreatePlayerDefaultKlaava(client):
    res = client.post("/players/", json={"name": "Test"})
    assert res.json()["klaava"] == 500

def testCreatePlayerWithRfid(client):
    res = client.post("/players/", json={"name": "Janne", "rfid": "AA:BB:CC:01"})
    assert res.json()["rfid"] == "AA:BB:CC:01"
