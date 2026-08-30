require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { getMintInfo, getTopHolders, computeConcentration } = require("./solana");
const { getDexScreenerData, getBirdeyeOverview } = require("./marketData");
const { computeRiskScore } = require("./riskEngine");
const { checkLpLock } = require("./lpLock");
const { getWalletActivity } = require("./walletActivity");
const { getPriceHistory } = require("./priceHistory");
const { listWatchlist, addToWatchlist, removeFromWatchlist } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Main endpoint: full analysis for a given SPL token mint address.
 * Combines on-chain mint/holder data, DexScreener + optional Birdeye
 * market data, and LP lock/burn status into a risk score.
 */
app.get("/api/analyze/:mint", async (req, res) => {
  const { mint } = req.params;

  try {
    const mintInfo = await getMintInfo(mint);

    const [holders, dexData, birdeye] = await Promise.all([
      getTopHolders(mint, mintInfo.supply, mintInfo.decimals).catch((err) => {
        console.error("Holder fetch failed:", err.message);
        return [];
      }),
      getDexScreenerData(mint).catch((err) => {
        console.error("DexScreener fetch failed:", err.message);
        return { found: false, pairs: [] };
      }),
      getBirdeyeOverview(mint).catch((err) => {
        console.error("Birdeye fetch failed:", err.message);
        return { enabled: false };
      }),
    ]);

    const lpLock = dexData?.found
      ? await checkLpLock(dexData.primary.pairAddress).catch((err) => ({
          status: "unknown",
          reason: err.message,
        }))
      : { status: "unknown", reason: "No trading pair found" };

    const concentration = computeConcentration(holders);
    const risk = computeRiskScore({ mintInfo, concentration, dexData, lpLock });

    res.json({
      mint,
      mintInfo,
      market: dexData,
      birdeye,
      lpLock,
      holders: {
        top: holders.slice(0, 10),
        concentration,
      },
      risk,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Historical OHLCV candles for charting (requires BIRDEYE_API_KEY).
 */
app.get("/api/price-history/:mint", async (req, res) => {
  const { mint } = req.params;
  const { resolution, limit } = req.query;

  try {
    const history = await getPriceHistory(mint, {
      resolution: resolution || "1H",
      limit: limit ? Number(limit) : 100,
    });
    res.json(history);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Recent transaction timeline for any Solana wallet address.
 */
app.get("/api/wallet/:address/activity", async (req, res) => {
  const { address } = req.params;
  const { limit } = req.query;

  try {
    const activity = await getWalletActivity(address, limit ? Number(limit) : 25);
    res.json({ address, transactions: activity });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Watchlist — save tokens for quick re-scanning later.
 */
app.get("/api/watchlist", (req, res) => {
  res.json({ items: listWatchlist() });
});

app.post("/api/watchlist", (req, res) => {
  const { mint, label } = req.body || {};
  if (!mint) return res.status(400).json({ error: "mint is required" });
  const item = addToWatchlist(mint, label);
  res.json({ item });
});

app.delete("/api/watchlist/:mint", (req, res) => {
  const removed = removeFromWatchlist(req.params.mint);
  if (!removed) return res.status(404).json({ error: "Not found in watchlist" });
  res.json({ removed: true });
});

app.listen(PORT, () => {
  console.log(`Token analysis backend running on port ${PORT}`);
});
