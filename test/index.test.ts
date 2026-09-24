import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("Worker runtime", () => {
  it("runs the Worker entrypoint", async () => {
    const response = await exports.default.fetch("https://example.com/unknown");

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
