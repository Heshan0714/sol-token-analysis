import { useState } from "react";
import "./App.css";
import { analyzeToken, addWatchlistItem } from "./api";
import RiskGauge from "./components/RiskGauge";
import FlagsLog from "./components/FlagsLog";
import StatCard from "./components/StatCard";
import PriceChart from "./components/PriceChart";
import WalletLookup from "./components/WalletLookup";
import Watchlist from "./components/Watchlist";

function fmtUsd(n) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Number(n).toFixed(2)}`;
}

function fmtPrice(p) {
  if (p === undefined || p === null) return "—";
  const num = Number(p);
  if (num < 0.01) return `$${num.toFixed(8)}`;
  return `$${num.toFixed(4)}`;
}

function shorten(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function lpLabel(lpLock) {
  if (!lpLock) return "—";
  if (lpLock.status === "burned") return "BURNED";
  if (lpLock.status === "locked") return "LOCKED";
  if (lpLock.status === "unlocked") return "UNLOCKED";
  return "UNKNOWN";
}

export default function App() {
  const [mint, setMint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [watchlistRefresh, setWatchlistRefresh] = useState(0);

  async function runScan(mintAddress) {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveState("idle");
    try {
      const data = await analyzeToken(mintAddress);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleScan(e) {
    e.preventDefault();
    if (!mint.trim()) return;
    runScan(mint);
  }

  function handleSelectFromWatchlist(selectedMint) {
    setMint(selectedMint);
    runScan(selectedMint);
  }

  async function handleSaveToWatchlist() {
    if (!result) return;
    setSaveState("saving");
    try {
      await addWatchlistItem(result.mint, null);
      setSaveState("saved");
      setWatchlistRefresh((k) => k + 1);
    } catch {
      setSaveState("idle");
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="topbar__mark">SCANR</span>
        <span className="topbar__tagline">Solana token forensics</span>
      </header>

      <section className="hero">
        <h1 className="hero__title">
          Paste a mint address.
          <br />
          <span className="hero__title-accent">See what it's hiding.</span>
        </h1>
        <p className="hero__sub">
          Cross-checks on-chain authority flags, LP lock status, holder
          concentration, and live market data in one pass.
        </p>

        <form className="scan-form" onSubmit={handleScan}>
          <input
            className="scan-form__input"
            type="text"
            placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            spellCheck={false}
          />
          <button className="scan-form__button" type="submit" disabled={loading}>
            {loading ? "SCANNING…" : "SCAN"}
          </button>
        </form>

        {error && <div className="error-banner">ERROR — {error}</div>}
      </section>

      {result && (
        <section className="results">
          <div className="results__top">
            <div className="results__gauge-block">
              <RiskGauge score={result.risk.score} level={result.risk.level} />
              <div className="mint-chip">
                <span className="mint-chip__label">MINT</span>
                <span className="mint-chip__addr">{shorten(result.mint)}</span>
              </div>
              <button
                className="save-button"
                onClick={handleSaveToWatchlist}
                disabled={saveState !== "idle"}
              >
                {saveState === "saved" ? "SAVED ✓" : saveState === "saving" ? "SAVING…" : "+ SAVE TO WATCHLIST"}
              </button>
            </div>

            <div className="stat-grid">
              <StatCard
                label="PRICE"
                value={result.market?.found ? fmtPrice(result.market.primary.priceUsd) : "—"}
              />
              <StatCard
                label="LIQUIDITY"
                value={result.market?.found ? fmtUsd(result.market.totalLiquidityUsd) : "—"}
              />
              <StatCard
                label="24H VOLUME"
                value={result.market?.found ? fmtUsd(result.market.totalVolume24h) : "—"}
              />
              <StatCard
                label="MARKET CAP"
                value={result.market?.found ? fmtUsd(result.market.primary.marketCap) : "—"}
              />
              <StatCard
                label="TOP 10 HOLD"
                value={`${result.holders.concentration.top10HolderPercent}%`}
              />
              <StatCard label="LP STATUS" value={lpLabel(result.lpLock)} />
            </div>
          </div>

          {result.market?.found && result.market.pairs?.length > 0 && (
            <div className="panel">
              <h2 className="panel__title">
                TRADING PAIRS {result.market.pairs.length > 1 ? `(${result.market.pairs.length})` : ""}
              </h2>
              <div className="pairs-table">
                <div className="pairs-table__header">
                  <span>DEX</span>
                  <span>PRICE</span>
                  <span>LIQUIDITY</span>
                  <span>24H VOL</span>
                </div>
                {result.market.pairs.map((p) => (
                  <a
                    key={p.pairAddress}
                    className="pairs-table__row"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="pairs-table__dex">{p.dexId}</span>
                    <span>{fmtPrice(p.priceUsd)}</span>
                    <span>{fmtUsd(p.liquidityUsd)}</span>
                    <span>{fmtUsd(p.volume24h)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="panel">
            <h2 className="panel__title">PRICE HISTORY</h2>
            <PriceChart mint={result.mint} />
          </div>

          <div className="results__bottom">
            <div className="panel">
              <h2 className="panel__title">ONCHAIN · MARKET · HOLDERS</h2>
              <FlagsLog flags={result.risk.flags} />
            </div>

            <div className="panel">
              <h2 className="panel__title">TOP HOLDERS</h2>
              <div className="holder-table">
                {result.holders.top.map((h, i) => (
                  <div className="holder-table__row" key={h.address}>
                    <span className="holder-table__rank">{i + 1}</span>
                    <span className="holder-table__addr">{shorten(h.address)}</span>
                    <span className="holder-table__pct">
                      {h.percentOfSupply.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="results" style={{ marginTop: 24 }}>
        <div className="results__bottom">
          <WalletLookup />
          <Watchlist onSelect={handleSelectFromWatchlist} refreshKey={watchlistRefresh} />
        </div>
      </section>
    </div>
  );
}
