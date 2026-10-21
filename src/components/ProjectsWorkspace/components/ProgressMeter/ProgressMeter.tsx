export function ProgressMeter({
  value,
  showLabel = true,
  compact = false,
}: {
  value: number;
  showLabel?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-2 flex items-center justify-between text-xs text-[#57606a]">
          <span>Progression</span>
          <span className="font-semibold text-[#24292f]">{value}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-[#d8dee4] ${compact ? 'h-1.5' : 'h-2'}`}>
        <div className="h-full rounded-full bg-[#0969da]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
