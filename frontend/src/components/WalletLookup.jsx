import { useState } from "react";
import { fetchWalletActivity } from "../api";

function shorten(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function fmtWhen(unixSeconds) {
  if (!unixSeconds) return "pending";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WalletLookup() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState(null);

  async function handleLookup(e) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setTransactions(null);
    try {
      const data = await fetchWalletActivity(address);
      setTransactions(data.transactions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2 className="panel__title">WALLET ACTIVITY TIMELINE</h2>
      <form className="wallet-form" onSubmit={handleLookup}>
        <input
          className="wallet-form__input"
          type="text"
          placeholder="Wallet address…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          spellCheck={false}
        />
        <button className="wallet-form__button" type="submit" disabled={loading}>
          {loading ? "LOADING…" : "LOOKUP"}
        </button>
      </form>

      {error && <div className="error-banner error-banner--inline">ERROR — {error}</div>}

      {transactions && transactions.length === 0 && (
        <div className="chart-empty">No recent transactions found for this address.</div>
      )}

      {transactions && transactions.length > 0 && (
        <div className="tx-timeline">
          {transactions.map((tx) => (
            <div className="tx-timeline__row" key={tx.signature}>
              <span
                className={`tx-timeline__dot tx-timeline__dot--${tx.status}`}
                aria-hidden="true"
              />
              <div className="tx-timeline__body">
                <div className="tx-timeline__top">
                  <span className="tx-timeline__sig">{shorten(tx.signature)}</span>
                  <span className="tx-timeline__time">{fmtWhen(tx.blockTime)}</span>
                </div>
                <span className="tx-timeline__programs">
                  {tx.programIds.length > 0
                    ? tx.programIds.map(shorten).join(", ")
                    : "no program data"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
