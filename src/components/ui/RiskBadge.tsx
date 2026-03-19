type RiskBadgeProps = {
  score: number;
};

function getRiskTone(score: number) {
  if (score >= 8) {
    return "bg-danger/14 text-danger";
  }

  if (score >= 5) {
    return "bg-warning/14 text-warning";
  }

  return "bg-info/14 text-info";
}

export function RiskBadge({ score }: RiskBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getRiskTone(score)}`}
    >
      Risk {score}
    </span>
  );
}
