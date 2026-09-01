export function PrivateBadge({ label }: { label: string }) {
  return (
    <span className="absolute top-1.5 left-1.5 rounded-pill bg-[rgba(27,24,21,0.72)] px-[7px] py-[3px] text-[10px] text-paper">
      {label}
    </span>
  );
}
