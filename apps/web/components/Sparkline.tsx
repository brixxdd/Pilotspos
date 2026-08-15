export function Sparkline({
  data,
  width = 72,
  height = 28,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const coords = data.map((value, index) => ({
    x: index * step,
    y: height - ((value - min) / range) * (height - 4) - 2,
  }));
  const lastPoint = coords[coords.length - 1] ?? { x: width, y: height / 2 };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline
        points={coords.map(({ x, y }) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={2} fill="currentColor" />
    </svg>
  );
}
