const TAG = {
  high: { text: "HIGH", color: "var(--red)" },
  medium: { text: "MED", color: "var(--amber)" },
  good: { text: "OK", color: "var(--cyan)" },
};

export default function FlagsLog({ flags }) {
  return (
    <div className="flags-log">
      {flags.map((flag, i) => {
        const tag = TAG[flag.severity] || TAG.good;
        return (
          <div className="flags-log__row" key={i}>
            <span className="flags-log__tag" style={{ color: tag.color, borderColor: tag.color }}>
              {tag.text}
            </span>
            <span className="flags-log__message">{flag.message}</span>
          </div>
        );
      })}
    </div>
  );
}
