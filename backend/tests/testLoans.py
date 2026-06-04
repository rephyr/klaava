def testCreateLoan(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    res = client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10})
    assert res.status_code == 200
    data = res.json()
    assert data["amount"] == 100
    assert data["amountOwed"] == 100
    assert data["status"] == "active"

def testCreateLoanAddsKlaavaToPlayer(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/loans/", json={"playerId": player["id"], "amount": 200, "interestRate": 0.10})
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 700

def testGetLoansByPlayer(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10})
    res = client.get(f"/loans/{player['id']}")
    assert res.status_code == 200
    assert len(res.json()) == 1

def testRepayLoan(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    loan = client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10}).json()
    res = client.post(f"/loans/{loan['id']}/repay")
    assert res.status_code == 200
    assert res.json()["status"] == "paid"

def testRepayLoanDeductsKlaava(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    loan = client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10}).json()
    client.post(f"/loans/{loan['id']}/repay")
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["klaava"] == 500

def testRepayLoanInsufficientKlaava(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 0}).json()
    loan = client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10}).json()
    client.put(f"/players/{player['id']}", json={"klaava": 0})
    res = client.post(f"/loans/{loan['id']}/repay")
    assert res.status_code == 400

def testDefaultLoanEliminatesPlayer(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    loan = client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10}).json()
    res = client.post(f"/loans/{loan['id']}/default")
    assert res.status_code == 200
    assert res.json()["status"] == "defaulted"
    updated = client.get(f"/players/{player['id']}").json()
    assert updated["eliminated"] == True

def testApplyInterest(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10})
    res = client.post("/loans/interest/apply")
    assert res.status_code == 200
    assert res.json()[0]["amountOwed"] == 110

def testApplyInterestCompounds(client):
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    client.post("/loans/", json={"playerId": player["id"], "amount": 100, "interestRate": 0.10})
    client.post("/loans/interest/apply")
    res = client.post("/loans/interest/apply")
    assert res.json()[0]["amountOwed"] == 121

def testLoanUsesSettingsInterestRate(client):
    client.put("/settings/", json={"loanInterestRate": 0.20})
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    loan = client.post("/loans/", json={"playerId": player["id"], "amount": 100}).json()
    assert loan["interestRate"] == 0.20

def testLoanExceedingMaxAmountIsRejected(client):
    client.put("/settings/", json={"maxLoanAmount": 200})
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    res = client.post("/loans/", json={"playerId": player["id"], "amount": 201})
    assert res.status_code == 400

def testLoanWithinMaxAmountIsAllowed(client):
    client.put("/settings/", json={"maxLoanAmount": 200})
    player = client.post("/players/", json={"name": "test1", "klaava": 500}).json()
    res = client.post("/loans/", json={"playerId": player["id"], "amount": 200})
    assert res.status_code == 200
