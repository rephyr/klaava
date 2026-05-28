def testGetSettingsReturnsDefaults(client):
    res = client.get("/settings/")
    assert res.status_code == 200
    data = res.json()
    assert data["startingKlaava"] == 500
    assert data["initialStake"] == 50
    assert data["stakeMultiplier"] == 2.0
    assert data["loanInterestRate"] == 0.10
    assert data["maxLoanAmount"] == 200
    assert data["gameMode"] == "tournament"

def testGetSettingsCreatesRowIfMissing(client):
    res1 = client.get("/settings/")
    res2 = client.get("/settings/")
    assert res1.json() == res2.json()

def testUpdateSettings(client):
    res = client.put("/settings/", json={"startingKlaava": 1000})
    assert res.status_code == 200
    assert res.json()["startingKlaava"] == 1000

def testUpdateSettingsPartial(client):
    client.put("/settings/", json={"initialStake": 100})
    res = client.get("/settings/")
    assert res.json()["initialStake"] == 100
    assert res.json()["startingKlaava"] == 500

def testUpdateGameMode(client):
    res = client.put("/settings/", json={"gameMode": "sit_and_go"})
    assert res.json()["gameMode"] == "sit_and_go"

def testUpdateMultipleFields(client):
    res = client.put("/settings/", json={"startingKlaava": 300, "maxLoanAmount": 500, "loanInterestRate": 0.20})
    data = res.json()
    assert data["startingKlaava"] == 300
    assert data["maxLoanAmount"] == 500
    assert data["loanInterestRate"] == 0.20
