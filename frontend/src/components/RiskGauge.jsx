const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Gauge sweeps 270deg (leaves a 90deg gap at the bottom), like an
// analog dial rather than a full ring.
const SWEEP_FRACTION = 0.75;
const SWEEP_LENGTH = CIRCUMFERENCE * SWEEP_FRACTION;
const START_ANGLE = 135; // degrees, rotation offset so gap sits at bottom

function colorForScore(score) {
  if (score >= 60) return "var(--red)";
  if (score >= 30) return "var(--amber)";
  return "var(--cyan)";
}

function labelForLevel(level) {
  if (level === "high") return "HIGH RISK";
  if (level === "medium") return "MEDIUM RISK";
  return "LOW RISK";
}

export default function RiskGauge({ score, level }) {
  const filled = (score / 100) * SWEEP_LENGTH;
  const color = colorForScore(score);

  return (
    <div className="risk-gauge">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: `rotate(${START_ANGLE}deg)` }}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${SWEEP_LENGTH} ${CIRCUMFERENCE}`}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          style={{
            transition: "stroke-dasharray 0.8s ease, stroke 0.4s ease",
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <div className="risk-gauge__readout">
        <span className="risk-gauge__score" style={{ color }}>
          {score}
        </span>
        <span className="risk-gauge__max">/100</span>
        <span className="risk-gauge__label" style={{ color }}>
          {labelForLevel(level)}
        </span>
      </div>
    </div>
  );
}
