type AppIconProps = {
  iconDataUrl?: string | null;
  name: string;
  size?: "sm" | "md";
};

const SIZE_CLASSES = {
  sm: "app-icon app-icon--sm",
  md: "app-icon app-icon--md",
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
        className={SIZE_CLASSES[size]}
        src={iconDataUrl}
      />
    );
  }

  return (
    <div className={`${SIZE_CLASSES[size]} app-icon--fallback`}>
      {initials || "?"}
    </div>
  );
}
