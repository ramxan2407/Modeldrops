import ModelDropsApp from "@/components/model-drops-app";
import { getChatGPTUser } from "../chatgpt-auth";
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
  searchParams: Promise<{ character?: string }>;
}) {
  const { section } = await params;
  const query = await searchParams;
  if (!isWorkspaceSection(section)) notFound();
  const returnTo = safeWorkspaceReturnTo(
    "/" +
      section +
      (query.character
        ? "?character=" + encodeURIComponent(query.character)
        : ""),
  );
  return (
    <ProtectedWorkspace
      section={section}
      returnTo={returnTo}
      character={query.character}
    />
  );
}
async function ProtectedWorkspace({
  section,
  returnTo,
  character,
}: {
  section: WorkspaceSection;
  returnTo: string;
  character?: string;
}) {
  const user = await getChatGPTUser();
  if (!user) redirect("/login?returnTo=" + encodeURIComponent(returnTo));
  return (
    <ModelDropsApp
      key={user.userId}
      initialPage={section}
      initialCharacter={character}
    />
  );
}
