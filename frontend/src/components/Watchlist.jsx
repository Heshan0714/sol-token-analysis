import { useEffect, useState } from "react";
import { fetchWatchlist, removeWatchlistItem } from "../api";

function shorten(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function Watchlist({ onSelect, refreshKey }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWatchlist()
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [refreshKey]);

  async function handleRemove(mint) {
    try {
      await removeWatchlistItem(mint);
      setItems((prev) => prev.filter((i) => i.mint !== mint));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <h2 className="panel__title">WATCHLIST</h2>

      {error && <div className="error-banner error-banner--inline">ERROR — {error}</div>}

      {items.length === 0 ? (
        <div className="chart-empty">
          No saved tokens yet. Scan a token, then "Save to watchlist" to track it here.
        </div>
      ) : (
        <div className="watchlist-table">
          {items.map((item) => (
            <div className="watchlist-table__row" key={item.mint}>
              <button
                className="watchlist-table__addr"
                onClick={() => onSelect(item.mint)}
                title="Re-scan this token"
              >
                {item.label || shorten(item.mint)}
              </button>
              <button
                className="watchlist-table__remove"
                onClick={() => handleRemove(item.mint)}
                aria-label={`Remove ${item.mint} from watchlist`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
