import { inspirationPrompt } from "@/lib/inspiration";
import ModelDropsApp from "@/components/model-drops-app";
import { isAdmin, isSuperAdmin } from "@/lib/server";
import { getAppUser } from "@/lib/app-auth";
import { notFound, redirect } from "next/navigation";
import {
  isWorkspaceSection,
  safeWorkspaceReturnTo,
  type WorkspaceSection,
} from "@/lib/navigation";
export const dynamic = "force-dynamic";
export default async function Section({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ character?: string; inspiration?: string }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  if (!isWorkspaceSection(section)) notFound();
  const search = new URLSearchParams();
  if (typeof query.character === "string")
    search.set("character", query.character);
  if (typeof query.inspiration === "string")
    search.set("inspiration", query.inspiration);
  const returnTo = safeWorkspaceReturnTo(
    "/" + section + "?" + search.toString(),
  );
  return (
    <ProtectedWorkspace
      section={section}
      returnTo={returnTo}
      character={query.character}
      prompt={
        section === "studio" ? (inspirationPrompt(query.inspiration) ?? "") : ""
      }
    />
  );
}
async function ProtectedWorkspace({
  section,
  returnTo,
  character,
  prompt,
}: {
  section: WorkspaceSection;
  returnTo: string;
  character?: string;
  prompt: string;
}) {
  const user = await getAppUser();
  if (!user) redirect("/login?returnTo=" + encodeURIComponent(returnTo));
  if (section === "admin" && !isSuperAdmin(user.userId)) notFound();
  if (section === "admin-training" && !isAdmin(user.userId)) notFound();
  return (
    <ModelDropsApp
      key={user.userId}
      initialPage={section}
      initialCharacter={character}
      initialPrompt={prompt}
    />
  );
}
