import test from "node:test";
import assert from "node:assert/strict";
import { isSameOriginRequest } from "../lib/request-origin";

const request = (origin?: string) =>
  new Request("http://localhost:3000/api/platform", {
    headers: {
      ...(origin ? { Origin: origin } : {}),
      Host: "attacker.test",
      "X-Forwarded-Host": "attacker.test",
      "X-Forwarded-Proto": "https",
    },
  });

test("configured browser origin works behind an internal server hostname", () => {
  assert.equal(
    isSameOriginRequest(
      request("https://modeldrops.test"),
      "https://modeldrops.test/",
    ),
    true,
  );
  assert.equal(
    isSameOriginRequest(
      request("http://127.0.0.1:4175"),
      "http://127.0.0.1:4175",
    ),
    true,
  );
  for (const origin of [
    undefined,
    "null",
    "https://attacker.test",
    "http://localhost:3000",
    "https://modeldrops.test.evil.test",
    "https://modeldrops.test:444",
  ])
    assert.equal(
      isSameOriginRequest(request(origin), "https://modeldrops.test"),
      false,
    );
});

test("malformed origin configuration fails closed instead of trusting the request", () => {
  for (const configured of [
    "",
    "not a URL",
    "https://user:password@modeldrops.test",
    "https://modeldrops.test/path",
    "https://modeldrops.test/?query=1",
    "https://modeldrops.test/#hash",
    "file:///",
    "null",
  ])
    assert.equal(
      isSameOriginRequest(request("http://localhost:3000"), configured),
      false,
    );
});

test("without a canonical origin, only the request URL origin is accepted", () => {
  assert.equal(isSameOriginRequest(request("http://localhost:3000")), true);
  assert.equal(isSameOriginRequest(request("https://attacker.test")), false);
  assert.equal(isSameOriginRequest(request()), false);
});
