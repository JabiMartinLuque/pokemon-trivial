import React from "react";

export function TimerBar({ startedAt, durationMs }) {
  const [pct, setPct] = React.useState(100);

  React.useEffect(() => {
    if (!startedAt || !durationMs) return;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, 1 - elapsed / durationMs);
      setPct(left * 100);
    };
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [startedAt, durationMs]);

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-poke-yellow transition-[width] duration-75 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
