const fetch = require("node-fetch");

const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex/tokens";

/**
 * DexScreener is free, no API key needed. Returns pair data: price, liquidity,
 * volume, price change, DEX name, etc. A token can have multiple pairs
 * (different DEXs / pairs) — we return the most liquid one as "primary".
 */
async function getDexScreenerData(mintAddress) {
  const url = `${DEXSCREENER_BASE}/${mintAddress}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`DexScreener request failed: ${res.status}`);
  }

  const data = await res.json();
  const pairs = data.pairs || [];

  if (pairs.length === 0) {
    return { found: false, pairs: [] };
  }

  const sorted = [...pairs].sort(
    (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  );
  const primary = sorted[0];

  return {
    found: true,
    primary: {
      dexId: primary.dexId,
      pairAddress: primary.pairAddress,
      priceUsd: primary.priceUsd,
      priceChange: primary.priceChange,
      liquidityUsd: primary.liquidity?.usd || 0,
      volume24h: primary.volume?.h24 || 0,
      fdv: primary.fdv,
      marketCap: primary.marketCap,
      pairCreatedAt: primary.pairCreatedAt,
      url: primary.url,
    },
    pairCount: pairs.length,
  };
}

/**
 * Optional cross-check via Birdeye (needs API key). Used as a secondary
 * source when BIRDEYE_API_KEY is configured; safe to skip otherwise.
 */
async function getBirdeyeOverview(mintAddress) {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) return { enabled: false };

  const url = `https://public-api.birdeye.so/defi/token_overview?address=${mintAddress}`;
  const res = await fetch(url, {
    headers: { "X-API-KEY": apiKey, "x-chain": "solana" },
  });

  if (!res.ok) {
    return { enabled: true, error: `Birdeye request failed: ${res.status}` };
  }

  const json = await res.json();
  if (!json.success) {
    return { enabled: true, error: "Birdeye returned no data" };
  }

  const d = json.data;
  return {
    enabled: true,
    price: d.price,
    liquidity: d.liquidity,
    holders: d.holder,
    volume24hUsd: d.v24hUSD,
    priceChange24hPercent: d.priceChange24hPercent,
  };
}

module.exports = { getDexScreenerData, getBirdeyeOverview };
