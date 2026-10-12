import { auth, initialize, bindings, assertOrigin, fail } from "@/lib/server";
import { CharacterCheckout } from "@/lib/characters/checkout";
import { requestJson } from "@/lib/http-body";
export async function GET(request: Request) {
  try {
    const user = await auth();
    await initialize(user);
    return Response.json(
      await new CharacterCheckout(bindings().DB, user.userId, bindings()).quote(
        new URL(request.url).searchParams.get("id") || "",
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const user = await auth();
    await initialize(user);
    return Response.json(
      await new CharacterCheckout(
        bindings().DB,
        user.userId,
        bindings(),
      ).complete(await requestJson(request, 4096)),
    );
  } catch (e) {
    return fail(e);
  }
}
