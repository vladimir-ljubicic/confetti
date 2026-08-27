export function GuestAvatar({ name, size }: { name: string; size: 40 | 52 }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-pill bg-sand font-serif text-gold-deep ${
        size === 52 ? "h-13 w-13 text-[23px]" : "h-10 w-10 text-lg"
      }`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
