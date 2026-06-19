import { AuthenticatedApp } from './_components/AuthenticatedApp';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return <AuthenticatedApp>{children}</AuthenticatedApp>;
}
