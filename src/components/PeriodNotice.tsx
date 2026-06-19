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
    <Alert
      className="period-notice"
      role="note"
      style={{ backgroundColor: colors.subtle, borderColor: colors.line }}
    >
      <strong style={{ color: colors.ink }}>{label}</strong>
      <AlertDescription style={{ color: colors.muted }}>{detail}</AlertDescription>
    </Alert>
  );
}
import { Alert, AlertDescription } from "@/components/ui/alert";
