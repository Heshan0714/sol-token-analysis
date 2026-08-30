/**
 * Combines on-chain mint info + holder concentration + market data
 * into a single risk score (0-100, higher = riskier) and a list of
 * human-readable flags.
 */
function computeRiskScore({ mintInfo, concentration, dexData, lpLock }) {
  const flags = [];
  let score = 0;

  // Mint authority still active = can create unlimited new supply
  if (mintInfo.mintAuthority) {
    score += 30;
    flags.push({
      severity: "high",
      message: "Mint authority is still active — supply can be inflated at any time.",
    });
  } else {
    flags.push({
      severity: "good",
      message: "Mint authority renounced — supply is fixed.",
    });
  }

  // Freeze authority active = can freeze any holder's tokens
  if (mintInfo.freezeAuthority) {
    score += 20;
    flags.push({
      severity: "high",
      message: "Freeze authority is still active — holder wallets can be frozen.",
    });
  } else {
    flags.push({
      severity: "good",
      message: "Freeze authority renounced.",
    });
  }

  // Holder concentration
  if (concentration.top10HolderPercent >= 70) {
    score += 25;
    flags.push({
      severity: "high",
      message: `Top 10 holders control ${concentration.top10HolderPercent}% of supply — high dump risk.`,
    });
  } else if (concentration.top10HolderPercent >= 40) {
    score += 12;
    flags.push({
      severity: "medium",
      message: `Top 10 holders control ${concentration.top10HolderPercent}% of supply.`,
    });
  } else {
    flags.push({
      severity: "good",
      message: `Holder distribution looks reasonably spread (top 10 hold ${concentration.top10HolderPercent}%).`,
    });
  }

  if (concentration.top1HolderPercent >= 30) {
    score += 10;
    flags.push({
      severity: "medium",
      message: `Single largest holder controls ${concentration.top1HolderPercent}% of supply.`,
    });
  }

  // Liquidity
  if (dexData?.found) {
    const liq = dexData.primary.liquidityUsd || 0;
    if (liq < 5000) {
      score += 15;
      flags.push({
        severity: "high",
        message: `Very low liquidity ($${liq.toLocaleString()}) — price can be manipulated easily.`,
      });
    } else if (liq < 20000) {
      score += 7;
      flags.push({
        severity: "medium",
        message: `Low liquidity ($${liq.toLocaleString()}).`,
      });
    } else {
      flags.push({
        severity: "good",
        message: `Liquidity looks healthy ($${liq.toLocaleString()}).`,
      });
    }

    // New pair age
    if (dexData.primary.pairCreatedAt) {
      const ageHours =
        (Date.now() - dexData.primary.pairCreatedAt) / (1000 * 60 * 60);
      if (ageHours < 24) {
        score += 10;
        flags.push({
          severity: "medium",
          message: `Trading pair is less than 24 hours old — very new token.`,
        });
      }
    }
  } else {
    score += 8;
    flags.push({
      severity: "medium",
      message: "No active DEX trading pair found — token may not be tradeable yet.",
    });
  }

  // LP lock/burn status
  if (lpLock) {
    if (lpLock.status === "unlocked") {
      score += 20;
      flags.push({
        severity: "high",
        message: "Liquidity pool tokens are not locked or burned — liquidity can be pulled at any time.",
      });
    } else if (lpLock.status === "locked") {
      flags.push({
        severity: "good",
        message: `LP tokens are locked (${lpLock.lockedPct}%).`,
      });
    } else if (lpLock.status === "burned") {
      flags.push({
        severity: "good",
        message: `LP tokens are burned (${lpLock.burnedPct ?? "~100"}%) — liquidity can't be pulled.`,
      });
    } else {
      flags.push({
        severity: "medium",
        message: `LP lock status could not be determined (${lpLock.reason || "unknown pool type"}).`,
      });
    }
  }

  score = Math.min(100, score);

  let level = "low";
  if (score >= 60) level = "high";
  else if (score >= 30) level = "medium";

  return { score, level, flags };
}

module.exports = { computeRiskScore };
