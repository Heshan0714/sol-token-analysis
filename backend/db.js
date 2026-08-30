const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    mint TEXT PRIMARY KEY,
    label TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

function listWatchlist() {
  return db.prepare("SELECT * FROM watchlist ORDER BY added_at DESC").all();
}

function addToWatchlist(mint, label) {
  db.prepare(
    "INSERT INTO watchlist (mint, label) VALUES (?, ?) ON CONFLICT(mint) DO UPDATE SET label = excluded.label"
  ).run(mint, label || null);
  return db.prepare("SELECT * FROM watchlist WHERE mint = ?").get(mint);
}

function removeFromWatchlist(mint) {
  const info = db.prepare("DELETE FROM watchlist WHERE mint = ?").run(mint);
  return info.changes > 0;
}

module.exports = { listWatchlist, addToWatchlist, removeFromWatchlist };
