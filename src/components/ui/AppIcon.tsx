type AppIconProps = {
  iconDataUrl?: string | null;
  name: string;
  size?: "sm" | "md";
};

const SIZE_CLASSES = {
  sm: "h-8 w-8 rounded-xl text-xs",
  md: "h-12 w-12 rounded-2xl text-sm",
};

export function AppIcon({ iconDataUrl, name, size = "md" }: AppIconProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

  if (iconDataUrl) {
    return (
      <img
        alt={`${name} icon`}
        className={`${SIZE_CLASSES[size]} shrink-0 border border-line bg-white/5 object-cover`}
        src={iconDataUrl}
      />
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center border border-line bg-white/6 font-semibold uppercase tracking-[0.16em] text-text-muted`}
    >
      {initials || "?"}
    </div>
  );
}
