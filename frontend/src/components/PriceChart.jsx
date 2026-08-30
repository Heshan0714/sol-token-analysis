import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchPriceHistory } from "../api";

function fmtTime(unix) {
  const d = new Date(unix * 1000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PriceChart({ mint }) {
  const [state, setState] = useState({ loading: true, available: false, candles: [] });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, available: false, candles: [] });

    fetchPriceHistory(mint, "1H")
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          available: data.available,
          reason: data.reason,
          candles: data.candles || [],
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, available: false, reason: err.message, candles: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [mint]);

  if (state.loading) {
    return <div className="chart-empty">Loading price history…</div>;
  }

  if (!state.available) {
    return (
      <div className="chart-empty">
        Price history unavailable — {state.reason || "no data source configured"}.
        <br />
        Add a <code>BIRDEYE_API_KEY</code> to the backend <code>.env</code> to enable this chart.
      </div>
    );
  }

  const data = state.candles.map((c) => ({ time: c.time, price: c.close }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tickFormatter={fmtTime}
          stroke="var(--text-faint)"
          fontSize={11}
          fontFamily="var(--font-mono)"
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          domain={["auto", "auto"]}
          stroke="var(--text-faint)"
          fontSize={11}
          fontFamily="var(--font-mono)"
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={(v) => `$${v.toFixed(v < 0.01 ? 6 : 4)}`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
          labelFormatter={fmtTime}
          formatter={(v) => [`$${Number(v).toFixed(6)}`, "Price"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="var(--cyan)"
          strokeWidth={2}
          fill="url(#priceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
