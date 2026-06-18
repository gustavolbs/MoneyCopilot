import { useTheme } from "@/lib/theme";

export function PeriodNotice({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  const { colors } = useTheme();

  return (
    <div
      className="period-notice"
      style={{ backgroundColor: colors.subtle, borderColor: colors.line }}
    >
      <strong style={{ color: colors.ink }}>{label}</strong>
      <span style={{ color: colors.muted }}>{detail}</span>
    </div>
  );
}
