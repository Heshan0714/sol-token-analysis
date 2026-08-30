const fetch = require("node-fetch");

/**
 * Historical OHLCV candles. Requires a Birdeye API key (free tier works) —
 * DexScreener's public API does not expose historical candles. Returns
 * { available: false } when no key is configured so the frontend can show
 * a clear "connect an API key" state instead of an error.
 */
async function getPriceHistory(mintAddress, { resolution = "1H", limit = 100 } = {}) {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    return { available: false, reason: "No BIRDEYE_API_KEY configured" };
  }

  const now = Math.floor(Date.now() / 1000);
  const secondsPerCandle = { "1H": 3600, "15m": 900, "1D": 86400 }[resolution] || 3600;
  const from = now - secondsPerCandle * limit;

  const url = `https://public-api.birdeye.so/defi/history_price?address=${mintAddress}&address_type=token&type=${resolution}&time_from=${from}&time_to=${now}`;

  const res = await fetch(url, {
    headers: { "X-API-KEY": apiKey, "x-chain": "solana" },
  });

  if (!res.ok) {
    return { available: false, reason: `Birdeye request failed: ${res.status}` };
  }

  const json = await res.json();
  if (!json.success || !json.data?.items) {
    return { available: false, reason: "No candle data returned" };
  }

  const candles = json.data.items.map((c) => ({
    time: c.unixTime,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.v,
  }));

  return { available: true, resolution, candles };
}

module.exports = { getPriceHistory };
