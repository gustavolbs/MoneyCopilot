import type { Metadata } from 'next';

import { SignInView } from './_components/SignInView';

export const metadata: Metadata = { title: 'Entrar' };

export default function SignInPage() {
  return <SignInView />;
}
