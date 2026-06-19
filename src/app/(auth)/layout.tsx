import { GuestApp } from './_components/GuestApp';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return <GuestApp>{children}</GuestApp>;
}
