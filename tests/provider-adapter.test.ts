import test from "node:test";
import assert from "node:assert/strict";
import { generationProvider } from "../lib/generation/provider";

test("Unconnected providers cannot receive generation requests", () => {
  let requests = 0;
  const fetcher = (async () => {
    requests++;
    throw new Error("Unexpected provider request");
  }) as typeof fetch;
  assert.throws(
    () => generationProvider("unconnected", {}, fetcher),
    /not connected/,
  );
  assert.equal(requests, 0);
});
