type AuthErrorDetails = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

function authErrorDetails(error: unknown): AuthErrorDetails {
  return typeof error === 'object' && error !== null ? error : {};
}

export function friendlyAuthError(error: unknown) {
  const details = authErrorDetails(error);
  const message = error instanceof Error
    ? error.message
    : typeof details.message === 'string'
      ? details.message
      : 'Não foi possível autenticar.';
  const code = typeof details.code === 'string' ? details.code : '';

  if (code === 'over_email_send_rate_limit' || /email.*rate limit|rate limit.*email/i.test(message)) {
    return 'O limite de e-mails de ativação foi atingido. Tente novamente mais tarde.';
  }
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/user already registered/i.test(message)) return 'Este e-mail já possui uma conta.';
  if (/password should be at least/i.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (code === 'over_request_rate_limit' || details.status === 429 || /rate limit/i.test(message)) {
    return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  }
  return message;
}
