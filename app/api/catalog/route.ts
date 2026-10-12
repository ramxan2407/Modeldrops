import { publicCatalog } from "@/lib/marketing/public-catalog";
import { fail } from "@/lib/server";
export async function GET() {
  try {
    return Response.json(
      { characters: await publicCatalog() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
