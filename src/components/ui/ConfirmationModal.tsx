type ConfirmationModalProps = {
  description: string;
  title: string;
};

export function ConfirmationModal({
  description,
  title,
}: ConfirmationModalProps) {
  return (
    <div className="rounded-[24px] border border-warning/30 bg-warning/10 p-5">
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
    </div>
  );
}
