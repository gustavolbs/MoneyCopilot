import { Insight } from '@/domain/insights';

export function DataTooltip({ id, title, body, detail }: { id: string; title: string; body: string; detail?: string }) {
  return (
    <div className="insight-tooltip" id={id} role="tooltip">
      <strong>{title}</strong>
      <span>{body}</span>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function InsightTooltip({ id, insight }: { id: string; insight: Insight }) {
  return <DataTooltip id={id} title="Detalhes do insight" body={insight.body} detail={insight.comparison} />;
}
