const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function analyzeToken(mintAddress) {
  const res = await fetch(`${API_BASE}/api/analyze/${mintAddress.trim()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Analysis failed");
  return data;
}

export async function fetchPriceHistory(mintAddress, resolution = "1H") {
  const res = await fetch(
    `${API_BASE}/api/price-history/${mintAddress.trim()}?resolution=${resolution}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Price history failed");
  return data;
}

export async function fetchWalletActivity(address) {
  const res = await fetch(`${API_BASE}/api/wallet/${address.trim()}/activity`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Wallet lookup failed");
  return data;
}

export async function fetchWatchlist() {
  const res = await fetch(`${API_BASE}/api/watchlist`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Watchlist fetch failed");
  return data.items;
}

export async function addWatchlistItem(mint, label) {
  const res = await fetch(`${API_BASE}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mint, label }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Add to watchlist failed");
  return data.item;
}

export async function removeWatchlistItem(mint) {
  const res = await fetch(`${API_BASE}/api/watchlist/${mint}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Remove from watchlist failed");
  }
  return true;
}
