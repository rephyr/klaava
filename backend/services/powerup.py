WIN_POWERUPS = ("doubleDown", "jackpot")
LOSS_POWERUPS = ("shield", "immunity")


def applyWinMultiplier(player, amount: int) -> tuple[int, str | None]:
    """Apply doubleDown/jackpot on a win. Returns (effective_amount, powerup_triggered)."""
    if player.powerup in WIN_POWERUPS:
        mult = 3 if player.powerup == "jackpot" else 2
        triggered = player.powerup
        player.powerup = None
        return amount * mult, triggered
    return amount, None


def applyLossShield(player) -> str | None:
    """Apply shield/immunity on a loss. Returns powerup name if blocked, else None."""
    if player.powerup in LOSS_POWERUPS:
        triggered = player.powerup
        player.powerup = None
        return triggered
    return None
