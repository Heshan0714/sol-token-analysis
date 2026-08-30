const fetch = require("node-fetch");
const { PublicKey } = require("@solana/web3.js");
const { connection } = require("./solana");

// Addresses that effectively destroy tokens sent to them.
const BURN_ADDRESSES = new Set([
  "1nc1nerator11111111111111111111111111111111",
  "11111111111111111111111111111111",
]);

// Well-known Solana token-lock program IDs (non-exhaustive). Tokens held by
// an account *owned by* one of these programs are considered locked rather
// than freely held by a person/team wallet.
const KNOWN_LOCKER_PROGRAMS = new Set([
  "LocktDzaV1W2Bm9DeZeiyz4J9zs4fRqNiYqQyracRXw", // Streamflow-style locker (placeholder/example id)
]);

const RAYDIUM_PAIRS_URL = "https://api.raydium.io/v2/main/pairs";

let raydiumPairsCache = null;
let raydiumPairsCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getRaydiumPairs() {
  const now = Date.now();
  if (raydiumPairsCache && now - raydiumPairsCacheAt < CACHE_TTL_MS) {
    return raydiumPairsCache;
  }
  const res = await fetch(RAYDIUM_PAIRS_URL);
  if (!res.ok) throw new Error(`Raydium pairs request failed: ${res.status}`);
  const data = await res.json();
  raydiumPairsCache = data;
  raydiumPairsCacheAt = now;
  return data;
}

/**
 * Best-effort LP lock/burn check. Currently only resolves LP mints for
 * Raydium pools (the dominant Solana AMM). Returns status: "burned",
 * "locked", "unlocked", or "unknown" (can't determine — e.g. a non-Raydium
 * pool, or Raydium's pair list didn't include this pool).
 */
async function checkLpLock(pairAddress) {
  if (!pairAddress) return { status: "unknown", reason: "No pair address" };

  let lpMint;
  try {
    const pairs = await getRaydiumPairs();
    const match = Array.isArray(pairs)
      ? pairs.find((p) => p.ammId === pairAddress || p.id === pairAddress)
      : null;
    lpMint = match?.lpMint;
  } catch (err) {
    return { status: "unknown", reason: `Raydium lookup failed: ${err.message}` };
  }

  if (!lpMint) {
    return { status: "unknown", reason: "Pool not found in Raydium pair list (may be a different DEX)" };
  }

  try {
    const mintPubkey = new PublicKey(lpMint);
    const largest = await connection.getTokenLargestAccounts(mintPubkey);
    const holders = largest.value;

    if (holders.length === 0) {
      return { status: "burned", reason: "LP mint has no token accounts (fully burned)", lpMint };
    }

    const totalHeld = holders.reduce((sum, h) => sum + Number(h.amount), 0);
    let burnedAmount = 0;
    let lockedAmount = 0;

    for (const h of holders) {
      const ownerAddr = h.address.toBase58();
      if (BURN_ADDRESSES.has(ownerAddr)) {
        burnedAmount += Number(h.amount);
      }
    }

    // Check account owners for known locker programs (requires an extra
    // RPC round-trip per account, so only do it for the top few holders).
    const topFew = holders.slice(0, 5);
    for (const h of topFew) {
      try {
        const info = await connection.getParsedAccountInfo(h.address);
        const owner = info.value?.data?.parsed?.info?.owner;
        if (owner && KNOWN_LOCKER_PROGRAMS.has(owner)) {
          lockedAmount += Number(h.amount);
        }
      } catch {
        // ignore individual lookup failures
      }
    }

    const burnedPct = totalHeld > 0 ? (burnedAmount / totalHeld) * 100 : 0;
    const lockedPct = totalHeld > 0 ? (lockedAmount / totalHeld) * 100 : 0;

    if (burnedPct >= 90) {
      return { status: "burned", burnedPct: Number(burnedPct.toFixed(1)), lpMint };
    }
    if (lockedPct >= 50) {
      return { status: "locked", lockedPct: Number(lockedPct.toFixed(1)), lpMint };
    }
    return {
      status: "unlocked",
      burnedPct: Number(burnedPct.toFixed(1)),
      lockedPct: Number(lockedPct.toFixed(1)),
      lpMint,
    };
  } catch (err) {
    return { status: "unknown", reason: `LP holder check failed: ${err.message}`, lpMint };
  }
}

module.exports = { checkLpLock };
