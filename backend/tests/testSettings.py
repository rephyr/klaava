def testGetSettingsReturnsDefaults(client):
    res = client.get("/settings/")
    assert res.status_code == 200
    data = res.json()
    assert data["startingKlaava"] == 500
    assert data["minBet"] == 50
    assert data["maxBet"] == 200
    assert data["betMultiplier"] == 2.0
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
    client.put("/settings/", json={"minBet": 100})
    res = client.get("/settings/")
    assert res.json()["minBet"] == 100
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

def testUpdateBetFields(client):
    res = client.put("/settings/", json={"minBet": 25, "maxBet": 500, "betMultiplier": 3.0})
    data = res.json()
    assert data["minBet"] == 25
    assert data["maxBet"] == 500
    assert data["betMultiplier"] == 3.0

def testTotalRoundsDefault(client):
    data = client.get("/settings/").json()
    assert data["totalRounds"] == 3

def testUpdateTotalRounds(client):
    res = client.put("/settings/", json={"totalRounds": 5})
    assert res.json()["totalRounds"] == 5

def testUpdateTotalRoundsDoesNotAffectOtherFields(client):
    client.put("/settings/", json={"totalRounds": 5})
    data = client.get("/settings/").json()
    assert data["totalRounds"] == 5
    assert data["startingKlaava"] == 500
