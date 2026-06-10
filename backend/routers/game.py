from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.connection import getDb
from database.schemas import TournamentCreate, TournamentRead, GameStartRequest, GameSessionRead, GameAdvanceRequest, TransferRequest
from database import crud
from routers import hiLo, blackjack, roulette, auction
from services.powerup import applyWinMultiplier
import random
import time

router = APIRouter(tags=["game"])

_liveState = {
    "lastResult": None,
    "wheelAngle": 0,
    "minigame": None,
}

def sessionToDict(session):
    return {
        "id": session.id,
        "mode": session.mode,
        "status": session.status,
        "currentPhase": session.currentPhase,
        "currentRound": session.currentRound,
        "currentLevel": session.currentLevel,
        "currentMinBet": session.currentMinBet,
        "currentMaxBet": session.currentMaxBet,
        "totalRounds": session.totalRounds,
        "gamblingRounds": session.gamblingRounds,
        "players": [sp.player for sp in session.sessionPlayers if sp.player is not None],
    }

@router.get("/game")
def getGameState(db: Session = Depends(getDb)):
    session = crud.getActiveSession(db)
    settings = crud.getSettings(db)
    activeGames = crud.getGames(db)
    segments = [g.name for g in activeGames if g.isActive]
    base = {
        "lastResult": _liveState["lastResult"],
        "wheelAngle": _liveState["wheelAngle"],
        "wheelSegments": segments,
        "minigame": _liveState["minigame"],
    }
    if session:
        return {
            **base,
            "phase": session.currentPhase,
            "round": session.currentRound,
            "level": session.currentLevel,
            "minBet": session.currentMinBet,
            "maxBet": session.currentMaxBet,
            "betMultiplier": settings.betMultiplier,
            "gameMode": session.mode,
            "sessionId": session.id,
            "totalRounds": session.totalRounds,
            "gamblingRounds": session.gamblingRounds,
        }
    return {
        **base,
        "phase": "lobby",
        "round": 0,
        "level": 1,
        "minBet": settings.minBet,
        "maxBet": settings.maxBet,
        "betMultiplier": settings.betMultiplier,
        "gameMode": settings.gameMode,
        "sessionId": None,
        "totalRounds": settings.totalRounds,
        "gamblingRounds": settings.gamblingRounds,
    }

@router.post("/game/start", response_model=GameSessionRead)
def startGame(data: GameStartRequest, db: Session = Depends(getDb)):
    if not data.playerIds:
        raise HTTPException(status_code=400, detail="No players provided")
    session = crud.startGame(db, data)
    if not session:
        raise HTTPException(status_code=400, detail="One or more players not found or already eliminated")
    # Reset all in-memory game states
    hiLo.resetState()
    blackjack.resetState()
    roulette.resetState()
    auction.resetState()
    _liveState["lastResult"] = None
    _liveState["wheelAngle"] = 0
    _liveState["minigame"] = None
    _horse_state["status"] = "idle"
    _horse_state["horses"] = []
    _horse_state["bets"] = []
    _horse_state["winnerId"] = None
    _horse_state["winnerName"] = None
    # Re-activate all games on the wheel
    crud.resetAllGames(db)
    return sessionToDict(session)

@router.post("/game/advance")
def advanceGame(data: GameAdvanceRequest, db: Session = Depends(getDb)):
    session = crud.advanceGame(db, data)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return {
        "phase": session.currentPhase,
        "round": session.currentRound,
        "level": session.currentLevel,
        "minBet": session.currentMinBet,
        "maxBet": session.currentMaxBet,
        "totalRounds": session.totalRounds,
        "gamblingRounds": session.gamblingRounds,
    }

@router.post("/game/transfer")
def transferKlaava(data: TransferRequest, db: Session = Depends(getDb)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    result = crud.transferKlaava(db, data)
    if not result:
        raise HTTPException(status_code=400, detail="Transfer failed — player not found or insufficient klaava")
    loserName = result['loser'].name
    winnerName = result['winner'].name
    amt = result['amount']
    if result['loserPowerupTriggered'] == 'immunity':
        msg = f"{loserName} used IMMUNITY — {winnerName} got {amt} kl from house"
    elif result['winnerPowerupTriggered'] in ('doubleDown', 'jackpot'):
        label = 'JACKPOT' if result['winnerPowerupTriggered'] == 'jackpot' else 'DD'
        msg = f"{loserName} paid {amt} kl → {winnerName} ({label}!)"
    else:
        msg = f"{loserName} paid {amt} kl to {winnerName}"
    _liveState["lastResult"] = msg
    return result

@router.post("/game/wheel/spin")
def spinWheel(db: Session = Depends(getDb)):
    activeGames = crud.getGames(db)
    segments = [g.name for g in activeGames if g.isActive]
    if not segments:
        raise HTTPException(status_code=400, detail="No active games to spin")
    winnerIndex = random.randint(0, len(segments) - 1)
    segmentAngle = 360 / len(segments)
    # Arrow sits at top of wheel = 270° in canvas coords (canvas 0° = right).
    # Random offset within the segment (0.1–0.9 avoids landing right on a border).
    offsetWithinSegment = random.random()
    centerOfWinner = (winnerIndex + offsetWithinSegment) * segmentAngle
    # Additional degrees needed from current wheel position to land winner under arrow.
    prevAngle = _liveState["wheelAngle"]
    additionalDeg = (270 - centerOfWinner - prevAngle) % 360
    spins = random.randint(5, 8)
    landAngle = prevAngle + additionalDeg + spins * 360
    _liveState["wheelAngle"] = landAngle
    return {
        "angle": landAngle,
        "winner": segments[winnerIndex],
        "winnerIndex": winnerIndex,
    }

@router.post("/game/stop")
def stopGame(db: Session = Depends(getDb)):
    session = crud.stopGame(db)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    _liveState["lastResult"] = None
    _liveState["minigame"] = None
    return {"message": "Game stopped"}

@router.post("/game/end")
def endGame(db: Session = Depends(getDb)):
    result = crud.endGame(db)
    if not result:
        raise HTTPException(status_code=404, detail="No active session")
    _liveState["lastResult"] = None
    _liveState["minigame"] = None
    return {
        "phase": "finished",
        "leaderboard": [
            {
                "position": e.finalPosition,
                "playerId": e.playerId,
                "playerName": e.player.name,
                "finalKlaava": e.finalKlaava,
            }
            for e in result["leaderboard"]
        ],
    }

@router.get("/game/leaderboard")
def getLeaderboard(db: Session = Depends(getDb)):
    session = crud.getLastFinishedSession(db)
    if not session:
        raise HTTPException(status_code=404, detail="No finished session found")
    entries = crud.getLeaderboard(db, session.id)
    return [
        {
            "position": e.finalPosition,
            "playerId": e.playerId,
            "playerName": e.player.name,
            "finalKlaava": e.finalKlaava,
        }
        for e in entries
    ]


class DoubleOrNothingRequest(BaseModel):
    playerIds: list[int]
    amount: int

@router.post("/minigame/doubleOrNothing")
def playDoubleOrNothing(data: DoubleOrNothingRequest, db: Session = Depends(getDb)):
    results = []
    for playerId in data.playerIds:
        player = crud.getPlayer(db, playerId)
        if not player or player.eliminated:
            continue
        won = random.random() < 0.5
        powerupTriggered = None
        earnedAmount = 0
        if won:
            earnedAmount, powerupTriggered = applyWinMultiplier(player, data.amount)
            player.klaava += earnedAmount
        results.append({
            "playerId": player.id,
            "name": player.name,
            "result": "win" if won else "lose",
            "amount": earnedAmount if won else data.amount,
            "klaava": player.klaava,
            "powerupTriggered": powerupTriggered,
        })
    db.commit()
    _liveState["minigame"] = {"type": "doubleOrNothing", "results": results}
    return {"results": results}


@router.post("/minigame/lastRoll")
def playLastRoll(db: Session = Depends(getDb)):
    session = crud.getActiveSession(db)
    if not session:
        raise HTTPException(status_code=400, detail="No active game")
    players = [sp.player for sp in session.sessionPlayers if sp.player and not sp.player.eliminated]
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 active players")

    rolls = {p.id: random.randint(1, 6) for p in players}
    minRoll = min(rolls.values())
    maxRoll = max(rolls.values())

    if minRoll == maxRoll:
        results = [{"playerId": p.id, "name": p.name, "roll": rolls[p.id], "outcome": "tie", "klaava": p.klaava} for p in players]
        _liveState["minigame"] = {"type": "lastRoll", "results": results, "amount": 0}
        return {"results": results, "amount": 0}

    amount = session.currentMinBet
    winners = [p for p in players if rolls[p.id] == maxRoll]

    # House pays winners — no deduction from losers
    boostedWinners = {}
    for p in winners:
        gain, pt = applyWinMultiplier(p, amount)
        if pt:
            boostedWinners[p.id] = pt
        p.klaava += gain

    db.commit()

    results = []
    for p in players:
        if rolls[p.id] == maxRoll:
            outcome = "winner"
        elif rolls[p.id] == minRoll:
            outcome = "loser"
        else:
            outcome = "neutral"
        pt = boostedWinners.get(p.id)
        results.append({"playerId": p.id, "name": p.name, "roll": rolls[p.id], "outcome": outcome, "klaava": p.klaava, "powerupTriggered": pt})

    _liveState["minigame"] = {"type": "lastRoll", "results": results, "amount": amount}
    return {"results": results, "amount": amount}

class AddPlayerRequest(BaseModel):
    playerId: int

@router.post("/game/addPlayer", response_model=GameSessionRead)
def addPlayerToSession(data: AddPlayerRequest, db: Session = Depends(getDb)):
    session = crud.addPlayerToSession(db, data.playerId)
    if not session:
        raise HTTPException(status_code=400, detail="Cannot add player — no active session, player not found, already in session, or eliminated")
    return sessionToDict(session)

@router.get("/game/session", response_model=GameSessionRead)
def getSession(db: Session = Depends(getDb)):
    session = crud.getActiveSession(db)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return sessionToDict(session)

@router.post("/tournaments", response_model=TournamentRead)
def createTournament(data: TournamentCreate, db: Session = Depends(getDb)):
    return crud.createTournament(db, data)

HORSE_NAMES = [
    "Ukko", "Tuulikki", "Rauhala", "Pitkämäki", "Laukki", "Talvikki",
    "Salamaveto", "Myrsky", "Loimu", "Varjo", "Halla", "Aava", "Vauhti",
    "Takuu", "Taika", "Velho", "Veto", "Panos", "Turbovauhti", "Pikaliito",
    "Ässä", "Hurjapää", "Tulikavio", "Viesker", "Täräyttäjä", "Vetäjä",
    "Nopsa", "Tuisku", "Hurja", "Vinha", "Salama",
]
HORSE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#06b6d4", "#ec4899"]
ATTACK_NAMES = ["Potku", "Puraisu", "Läpsäisy", "Sylkäisy",]
TRACK_LENGTH = 24
HORSE_MAX_HP = 10

def _run_tiebreaker(tied_horses):
    import copy
    fighters = copy.deepcopy(tied_horses)
    for f in fighters:
        f['hp'] = HORSE_MAX_HP
        f['maxHp'] = HORSE_MAX_HP
        f['status'] = 'racing'
    attacks = []
    while len([f for f in fighters if f['status'] == 'racing']) > 1 and len(attacks) < 40:
        alive = [f for f in fighters if f['status'] == 'racing']
        for attacker in alive[:]:
            if attacker['status'] != 'racing':
                continue
            targets = [f for f in fighters if f['status'] == 'racing' and f['id'] != attacker['id']]
            if not targets:
                break
            defender = random.choice(targets)
            dmg = random.randint(2, 5)
            defender['hp'] = max(0, defender['hp'] - dmg)
            attacks.append({
                'type': 'attack',
                'attackerName': attacker['name'],
                'attackerColor': attacker['color'],
                'defenderName': defender['name'],
                'defenderColor': defender['color'],
                'attackName': random.choice(ATTACK_NAMES),
                'damage': dmg,
                'defenderHp': defender['hp'],
                'defenderMaxHp': defender['maxHp'],
            })
            if defender['hp'] <= 0:
                defender['status'] = 'dead'
                attacks.append({'type': 'death', 'name': defender['name'], 'color': defender['color']})
    survivors = [f for f in fighters if f['status'] == 'racing']
    winner_id = survivors[0]['id'] if survivors else tied_horses[0]['id']
    return winner_id, attacks

def _assignOdds(horses):
    totals = [h["speed"] + h["endurance"] + h["luck"] for h in horses]
    minT, maxT = min(totals), max(totals)
    for h, total in zip(horses, totals):
        if maxT == minT:
            base = 3.5
        else:
            t = (total - minT) / (maxT - minT)
            base = 8.0 - t * 6.5
        h["odds"] = max(1.5, round(base * random.uniform(0.85, 1.25), 1))

def _makeHorses(n=5):
    names = random.sample(HORSE_NAMES, n)
    horses = [
        {
            "id": i + 1,
            "name": name,
            "color": HORSE_COLORS[i],
            "maxHp": HORSE_MAX_HP,
            "speed": random.randint(1, 5),
            "endurance": random.randint(1, 5),
            "luck": random.randint(1, 5),
            "odds": 0.0,
            "position": 0,
            "status": "racing",
            "hp": HORSE_MAX_HP,
            "tiredRoundsLeft": 0,
            "stumbleRoundsLeft": 0,
            "motivatedRoundsLeft": 0,
            "fightRoundsLeft": 0,
            "fightOpponent": None,
            "staminaLeft": 0,
        }
        for i, name in enumerate(names)
    ]
    for h in horses:
        h["staminaLeft"] = h["endurance"] * 3
    _assignOdds(horses)
    return horses

def _snapshot(horses):
    return [
        {
            "id": h["id"],
            "position": h["position"],
            "status": h["status"],
            "hp": h["hp"],
            "maxHp": h["maxHp"],
            "fighting": h["fightRoundsLeft"] > 0,
            "tired": h["tiredRoundsLeft"] > 0,
            "stumbling": h["stumbleRoundsLeft"] > 0,
            "motivated": h["motivatedRoundsLeft"] > 0,
        }
        for h in horses
    ]

def _simulateRace(horses):
    rounds = [{"roundNumber": 0, "positions": _snapshot(horses), "events": []}]

    for rn in range(1, 9):
        events = []

        # Initiate new fights between nearby horses
        free = [h for h in horses if h["status"] == "racing" and h["fightRoundsLeft"] == 0 and h["position"] > 2]
        seen = set()
        for i, h1 in enumerate(free):
            if h1["id"] in seen:
                continue
            for h2 in free[i + 1:]:
                if h2["id"] in seen:
                    continue
                if abs(h1["position"] - h2["position"]) <= 1 and random.random() < 0.2:
                    dur = random.randint(1, 2)
                    h1["fightRoundsLeft"] = dur
                    h1["fightOpponent"] = h2["id"]
                    h2["fightRoundsLeft"] = dur
                    h2["fightOpponent"] = h1["id"]
                    seen |= {h1["id"], h2["id"]}
                    events.append({"type": "fight_start", "detail": f"⚔️ {h1['name']} and {h2['name']} are fighting!"})
                    break

        # Resolve ongoing fights
        done = set()
        for h in horses:
            if h["status"] != "racing" or h["fightRoundsLeft"] <= 0 or h["id"] in done:
                continue
            opp = next((x for x in horses if x["id"] == h["fightOpponent"]), None)
            if not opp:
                h["fightRoundsLeft"] = 0
                continue
            done |= {h["id"], opp["id"]}

            # Exchange attacks
            fatal = False
            for attacker, defender in [(h, opp), (opp, h)]:
                if attacker["status"] != "racing" or defender["status"] != "racing":
                    continue
                dmg = random.randint(2, 4)
                defender["hp"] = max(0, defender["hp"] - dmg)
                events.append({
                    "type": "attack",
                    "attackerName": attacker["name"],
                    "attackerColor": attacker["color"],
                    "defenderName": defender["name"],
                    "defenderColor": defender["color"],
                    "attackName": random.choice(ATTACK_NAMES),
                    "damage": dmg,
                    "defenderHp": defender["hp"],
                    "defenderMaxHp": defender["maxHp"],
                })
                if defender["hp"] <= 0:
                    defender["status"] = "dead"
                    attacker["fightRoundsLeft"] = 0
                    attacker["fightOpponent"] = None
                    attacker["speed"] = max(1, attacker["speed"] - 1)
                    events.append({"type": "death", "detail": f"💀 {defender['name']} died in the fight! {attacker['name']} wins but is weakened."})
                    fatal = True
                    break
            if fatal:
                continue

            h["fightRoundsLeft"] -= 1
            if opp["fightRoundsLeft"] > 0:
                opp["fightRoundsLeft"] -= 1
            if h["fightRoundsLeft"] <= 0 and opp.get("status") == "racing":
                if random.random() < 0.25:
                    loser, winner = random.choice([(h, opp), (opp, h)])
                    loser["status"] = "dead"
                    winner["fightRoundsLeft"] = 0
                    winner["fightOpponent"] = None
                    winner["speed"] = max(1, winner["speed"] - 1)
                    events.append({"type": "death", "detail": f"💀 {loser['name']} died in the fight! {winner['name']} wins but is weakened."})
                else:
                    h["fightOpponent"] = None
                    opp["fightOpponent"] = None
                    events.append({"type": "fight_end", "detail": f"{h['name']} and {opp['name']} stop fighting."})

        # Move each racing horse
        for h in horses:
            if h["status"] != "racing" or h["fightRoundsLeft"] > 0:
                continue
            if h["stumbleRoundsLeft"] > 0:
                h["stumbleRoundsLeft"] -= 1
                continue

            spd = h["speed"]
            if h["tiredRoundsLeft"] > 0:
                spd = max(1, spd - 1)
                h["tiredRoundsLeft"] -= 1
            if h["motivatedRoundsLeft"] > 0:
                spd += 1
                h["motivatedRoundsLeft"] -= 1

            h["position"] = min(h["position"] + spd + random.randint(0, 2), TRACK_LENGTH)

            # Stamina drain
            h["staminaLeft"] -= 1
            if h["staminaLeft"] <= 0 and h["tiredRoundsLeft"] == 0:
                h["tiredRoundsLeft"] = 2
                h["staminaLeft"] = max(2, h["endurance"] * 2)
                events.append({"type": "tired", "detail": f"😮‍💨 {h['name']} is getting tired!"})

            # Random luck events
            roll = random.random()
            if roll < 0.06 and h["stumbleRoundsLeft"] == 0:
                h["stumbleRoundsLeft"] = 1
                events.append({"type": "stumble", "detail": f"🤕 {h['name']} stumbles and loses a turn!"})
            elif roll < 0.06 + h["luck"] * 0.025:
                h["motivatedRoundsLeft"] = max(h["motivatedRoundsLeft"], 2)
                events.append({"type": "motivated", "detail": f"⚡ {h['name']} gets a burst of energy!"})

        rounds.append({"roundNumber": rn, "positions": _snapshot(horses), "events": events})

        # Stop when someone finishes or all are dead
        if any(h["status"] == "racing" and h["position"] >= TRACK_LENGTH for h in horses):
            break
        if not any(h["status"] == "racing" for h in horses):
            break

    return rounds

_horse_state = {
    "status": "idle",
    "horses": [],
    "bets": [],
    "winnerId": None,
    "winnerName": None,
}

class HorseRaceBet(BaseModel):
    playerId: int
    playerName: str
    horseId: int
    amount: int

@router.get("/minigame/horseRace/state")
def getHorseRaceState():
    return _horse_state

@router.post("/minigame/horseRace/start")
def startHorseRace():
    _horse_state["status"] = "betting"
    _horse_state["horses"] = _makeHorses(5)
    _horse_state["bets"] = []
    _horse_state["winnerId"] = None
    _horse_state["winnerName"] = None
    return _horse_state

@router.post("/minigame/horseRace/bet")
def placeHorseRaceBet(data: HorseRaceBet):
    if _horse_state["status"] != "betting":
        raise HTTPException(status_code=400, detail="No active horse race")
    horse = next((h for h in _horse_state["horses"] if h["id"] == data.horseId), None)
    if not horse:
        raise HTTPException(status_code=404, detail="Horse not found")
    existing = next((b for b in _horse_state["bets"] if b["playerId"] == data.playerId), None)
    if existing:
        existing.update({"horseId": data.horseId, "horseName": horse["name"], "amount": data.amount,
                         "result": None, "payout": None, "powerupTriggered": None})
    else:
        _horse_state["bets"].append({
            "playerId": data.playerId, "playerName": data.playerName,
            "horseId": data.horseId, "horseName": horse["name"],
            "amount": data.amount, "result": None, "payout": None,
            "powerupTriggered": None, "klaava": None,
        })
    return _horse_state

@router.post("/minigame/horseRace/run")
def runHorseRace(db: Session = Depends(getDb)):
    if _horse_state["status"] != "betting":
        raise HTTPException(status_code=400, detail="No active horse race")
    if not _horse_state["bets"]:
        raise HTTPException(status_code=400, detail="No bets placed")

    # Deep-copy horse stats for simulation (don't mutate _horse_state display horses)
    import copy
    sim_horses = copy.deepcopy(_horse_state["horses"])
    rounds = _simulateRace(sim_horses)

    # Detect photo finish before picking winner
    last_positions = rounds[-1]["positions"]
    finisher_ids = [p["id"] for p in last_positions if p["position"] >= TRACK_LENGTH]
    photo_finish = len(finisher_ids) > 1

    tiebreaker = None
    if photo_finish:
        tied_horses = [h for h in sim_horses if h["id"] in finisher_ids]
        tb_winner_id, tb_attacks = _run_tiebreaker(tied_horses)
        winner_horse = next(h for h in sim_horses if h["id"] == tb_winner_id)
        tiebreaker = {"attacks": tb_attacks, "maxHp": HORSE_MAX_HP}
    else:
        racing = [h for h in sim_horses if h["status"] == "racing"]
        winner_horse = max(racing, key=lambda h: (h["position"], h["speed"])) if racing else None

    winner_id = winner_horse["id"] if winner_horse else None
    winner_name = winner_horse["name"] if winner_horse else None
    _horse_state["winnerId"] = winner_id
    _horse_state["winnerName"] = winner_name
    _horse_state["status"] = "finished"

    # Map simulated status back to display horses
    sim_by_id = {h["id"]: h for h in sim_horses}
    for h in _horse_state["horses"]:
        h["finalStatus"] = sim_by_id[h["id"]]["status"]
        h["finalPosition"] = sim_by_id[h["id"]]["position"]

    # Resolve payouts — no losses; winners earn bet × horse odds (house-funded)
    winner_odds = winner_horse["odds"] if winner_horse else 2.0

    for bet in _horse_state["bets"]:
        player = crud.getPlayer(db, bet["playerId"])
        if not player:
            continue
        horse_sim = sim_by_id[bet["horseId"]]
        if horse_sim["status"] == "dead":
            bet["result"] = "dead"
            bet["payout"] = 0
            bet["klaava"] = player.klaava
        elif bet["horseId"] != winner_id:
            bet["result"] = "lose"
            bet["payout"] = 0
            bet["klaava"] = player.klaava

    for bet in [b for b in _horse_state["bets"] if b["horseId"] == winner_id]:
        player = crud.getPlayer(db, bet["playerId"])
        if not player:
            continue
        payout, powerupTriggered = applyWinMultiplier(player, round(bet["amount"] * winner_odds))
        player.klaava += payout
        bet["result"] = "win"
        bet["payout"] = payout
        bet["powerupTriggered"] = powerupTriggered
        bet["klaava"] = player.klaava

    db.commit()
    _liveState["minigame"] = {
        "type": "horseRace",
        "raceId": str(int(time.time() * 1000)),
        "horses": _horse_state["horses"],
        "bets": _horse_state["bets"],
        "rounds": rounds,
        "trackLength": TRACK_LENGTH,
        "winnerId": winner_id,
        "winnerName": winner_name,
        "photoFinish": photo_finish,
        "photoFinishIds": finisher_ids,
        "tiebreaker": tiebreaker,
    }
    return _horse_state

@router.post("/minigame/horseRace/reset")
def resetHorseRace():
    _horse_state["status"] = "idle"
    _horse_state["horses"] = []
    _horse_state["bets"] = []
    _horse_state["winnerId"] = None
    _horse_state["winnerName"] = None
    return _horse_state

@router.get("/tournaments/{tournamentId}", response_model=TournamentRead)
def getTournament(tournamentId: int, db: Session = Depends(getDb)):
    tournament = crud.getTournament(db, tournamentId)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament
