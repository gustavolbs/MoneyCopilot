import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatMonthShort, formatMonthYear, todayISODate } from '@/domain/normalize';

describe('date formatting', () => {
  it('uses consistent pt-BR formats for dates and periods', () => {
    expect(formatDate('2026-06-17')).toBe('17/06/2026');
    expect(formatMonthYear('2026-06')).toBe('junho de 2026');
    expect(formatMonthShort('2026-06')).toBe('jun');
  });

  it('does not shift date-only values through UTC', () => {
    expect(formatDate('2026-06-17T23:30:00.000Z')).toBe('17/06/2026');
    expect(todayISODate(new Date(2026, 5, 17, 23, 30))).toBe('2026-06-17');
  });

  it('formats timestamps with date and time and preserves invalid values', () => {
    expect(formatDateTime(new Date(2026, 5, 17, 9, 5))).toBe('17/06/2026, 09:05');
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('2026-02-31')).toBe('2026-02-31');
  });
});
