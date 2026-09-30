import { MarketingShell } from "@/components/marketing/shell";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingShell>{children}</MarketingShell>;
}
