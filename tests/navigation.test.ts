import assert from "node:assert/strict";
import test from "node:test";
import { safeWorkspaceReturnTo } from "../lib/navigation";

test("login destinations reject external, malformed and unsupported paths", () => {
  for (const path of [
    undefined,
    null,
    "",
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/login",
    "/signin-with-chatgpt",
    "/dashboard#foo",
  ]) {
    assert.equal(safeWorkspaceReturnTo(path), "/dashboard");
  }
});
test("login preserves a valid studio character without forwarding arbitrary parameters", () => {
  assert.equal(
    safeWorkspaceReturnTo(
      "/studio?character=valentina&return_to=https://evil.test",
    ),
    "/studio?character=valentina",
  );
  assert.equal(safeWorkspaceReturnTo("/library"), "/library");
  assert.equal(
    safeWorkspaceReturnTo("/studio?character=%3Cscript%3E"),
    "/studio",
  );
});

test("welcome inspiration survives login only for known Studio presets", () => {
  assert.equal(
    safeWorkspaceReturnTo(
      "/studio?inspiration=valentina.editorial&redirect=https://evil.test",
    ),
    "/studio?inspiration=valentina.editorial",
  );
  assert.equal(
    safeWorkspaceReturnTo("/studio?inspiration=valentina.unknown"),
    "/studio",
  );
  assert.equal(
    safeWorkspaceReturnTo("/studio?inspiration=unknown.cinematic"),
    "/studio",
  );
  assert.equal(
    safeWorkspaceReturnTo("/billing?inspiration=valentina.editorial"),
    "/billing",
  );
  assert.equal(
    safeWorkspaceReturnTo("/studio?inspiration=valentina.editorial.extra"),
    "/studio",
  );
});
