import { describe, expect, it } from 'vitest';

import { friendlyAuthError } from '@/lib/authErrors';

describe('friendlyAuthError', () => {
  it('distinguishes the activation email quota from repeated user attempts', () => {
    expect(friendlyAuthError({
      code: 'over_email_send_rate_limit',
      message: 'Email rate limit exceeded',
      status: 429,
    })).toBe('O limite de e-mails de ativação foi atingido. Tente novamente mais tarde.');
  });

  it('keeps the generic message for other request limits', () => {
    expect(friendlyAuthError({
      code: 'over_request_rate_limit',
      message: 'Request rate limit exceeded',
      status: 429,
    })).toBe('Muitas tentativas. Aguarde um pouco e tente novamente.');
  });
});
