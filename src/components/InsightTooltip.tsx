import { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Insight } from '@/domain/insights';

export function DataTooltip({ children, title, body, detail }: { children: ReactNode; title: string; body: string; detail?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="contents" />}>{children}</TooltipTrigger>
      <TooltipContent className="flex max-w-[280px] flex-col items-start gap-1.5 px-3 py-2">
        <strong className="text-[10px] uppercase">{title}</strong>
        <span className="text-[11px] leading-snug">{body}</span>
        {detail ? <small className="text-[9px] opacity-70">{detail}</small> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function InsightTooltip({ children, insight }: { children: ReactNode; insight: Insight }) {
  return <DataTooltip title="Detalhes do insight" body={insight.body} detail={insight.comparison}>{children}</DataTooltip>;
}
