import { AppShell } from "@/components/shop/app-shell";

export default function ManageLayout({ children }: LayoutProps<"/[shop]">) {
  return <AppShell>{children}</AppShell>;
}
