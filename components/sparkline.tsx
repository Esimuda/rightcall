export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) {
    return <span className="text-xs text-muted">Need two results</span>;
  }
  const width = 112;
  const height = 32;
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 2 - value * (height - 4);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={path} fill="none" stroke="#D6F25C" strokeWidth="1.6" />
    </svg>
  );
}
