import { ConfigService } from "@nestjs/config";

import { ClickUpApiClient } from "@/providers/clickup/clickup-api.client";

describe("ClickUpApiClient", () => {
  afterEach(() => jest.restoreAllMocks());

  it("retries safe reads after a ClickUp rate-limit response", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ err: "rate limited" }), { status: 429, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 42, username: "Test User", email: "test@example.com" } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = new ClickUpApiClient(new ConfigService({ clickup: { apiBaseUrl: "https://clickup.test" } }));

    const response = await client.getAuthorizedUser("oauth-token");

    expect(response.user.email).toBe("test@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry time-entry writes", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ err: "upstream unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } }),
    );
    const client = new ClickUpApiClient(new ConfigService({ clickup: { apiBaseUrl: "https://clickup.test" } }));

    await expect(client.createTimeEntry("oauth-token", "workspace", { taskId: "task", startMs: 1, durationMinutes: 5 })).rejects.toThrow("upstream unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends personal API tokens without the OAuth Bearer scheme", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 42, username: "Test User", email: "test@example.com" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new ClickUpApiClient(new ConfigService({ clickup: { apiBaseUrl: "https://clickup.test" } }));

    await client.getAuthorizedUser("pk_personal-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://clickup.test/user",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "pk_personal-token" }) }),
    );
  });

  it("keeps the Bearer scheme for OAuth access tokens", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 42, username: "Test User", email: "test@example.com" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new ClickUpApiClient(new ConfigService({ clickup: { apiBaseUrl: "https://clickup.test" } }));

    await client.getAuthorizedUser("oauth-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://clickup.test/user",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer oauth-token" }) }),
    );
  });
});
