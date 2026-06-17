import { ParsedTransaction } from '@/domain/types';
import { env } from '@/lib/env';

export async function classifyWithOpenAI(_description: string, _amount: number): Promise<Partial<ParsedTransaction> | null> {
  if (!env.enableAi || !env.openAiApiKey) return null;
  // Intentionally disabled in MVP UI. This function is the consent-gated integration point.
  // Only description and amount should ever be sent, never household, user, notes or account data.
  return null;
}
