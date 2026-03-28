type RiskBadgeProps = {
  score: number;
};

function getRiskTone(score: number) {
  if (score >= 8) {
    return "risk-badge--high";
  }

  if (score >= 5) {
    return "risk-badge--medium";
  }

  return "risk-badge--low";
}

export function RiskBadge({ score }: RiskBadgeProps) {
  return <span className={`risk-badge ${getRiskTone(score)}`}>Risk {score}</span>;
}
