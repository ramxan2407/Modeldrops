import { redirect } from "next/navigation";
import { safeWorkspaceReturnTo } from "@/lib/navigation";
export default async function Create({
  searchParams,
}: {
  searchParams: Promise<{ character?: string; inspiration?: string }>;
}) {
  const q = await searchParams;
  const p = new URLSearchParams();
  if (q.character) p.set("character", q.character);
  if (q.inspiration) p.set("inspiration", q.inspiration);
  redirect(safeWorkspaceReturnTo("/studio?" + p.toString()));
}
