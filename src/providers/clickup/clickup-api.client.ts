import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  ClickUpApiError,
  ClickUpAuthorizedUser,
  ClickUpTaskDto,
  ClickUpTimeEntryDto,
  ClickUpWorkspaceDto,
} from "@/providers/clickup/clickup-api.types";

@Injectable()
export class ClickUpApiClient {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = configService.get<string>("clickup.apiBaseUrl") || "https://api.clickup.com/api/v2";
  }

  async exchangeCode(code: string): Promise<string> {
    const result = await this.request<{ access_token: string }>("/oauth/token", {
      method: "POST",
      body: JSON.stringify({
        client_id: this.configService.get<string>("clickup.clientId"),
        client_secret: this.configService.get<string>("clickup.clientSecret"),
        code,
      }),
    });
    return result.access_token;
  }

  getAuthorizedUser(token: string): Promise<ClickUpAuthorizedUser> {
    return this.request("/user", {}, token);
  }

  async getAuthorizedWorkspaces(token: string): Promise<ClickUpWorkspaceDto[]> {
    const response = await this.request<{ teams: ClickUpWorkspaceDto[] }>("/team", {}, token);
    return response.teams;
  }

  async getAssignedTasks(token: string, workspaceId: string, clickupUserId: string): Promise<ClickUpTaskDto[]> {
    const tasks: ClickUpTaskDto[] = [];
    for (let page = 0; ; page += 1) {
      const params = new URLSearchParams({ page: String(page), include_closed: "true" });
      params.append("assignees[]", clickupUserId);
      const response = await this.request<{ tasks: ClickUpTaskDto[] }>(
        `/team/${workspaceId}/task?${params.toString()}`,
        {},
        token,
      );
      tasks.push(...response.tasks);
      if (response.tasks.length < 100) break;
    }
    return tasks;
  }

  async getTimeEntries(
    token: string,
    workspaceId: string,
    startMs: number,
    endMs: number,
  ): Promise<ClickUpTimeEntryDto[]> {
    const params = new URLSearchParams({ start_date: String(startMs), end_date: String(endMs) });
    const response = await this.request<{ data: ClickUpTimeEntryDto[] }>(
      `/team/${workspaceId}/time_entries?${params.toString()}`,
      {},
      token,
    );
    return response.data;
  }

  async createTimeEntry(
    token: string,
    workspaceId: string,
    input: { taskId: string; startMs: number; durationMinutes: number; description?: string | null },
  ): Promise<string> {
    const response = await this.request<{ data?: { id: string }; id?: string }>(
      `/team/${workspaceId}/time_entries`,
      {
        method: "POST",
        body: JSON.stringify({
          tid: input.taskId,
          start: input.startMs,
          duration: input.durationMinutes * 60_000,
          description: input.description || "Automated missing time entry",
        }),
      },
      token,
    );
    const id = response.data?.id || response.id;
    if (!id) throw new ClickUpApiError("ClickUp did not return a time-entry ID", 502);
    return id;
  }

  private async request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
    const method = init.method || "GET";
    const attempts = method === "GET" ? 3 : 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          signal: AbortSignal.timeout(10_000),
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: this.authorizationHeader(token) } : {}),
            ...init.headers,
          },
        });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (response.ok) return body as T;

        const message = String(body.err || body.error || body.message || `ClickUp request failed (${response.status})`);
        const error = new ClickUpApiError(message, response.status, body.ECODE ? String(body.ECODE) : undefined);
        if (attempt < attempts && (response.status === 429 || response.status >= 500)) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 500, 2_000)));
          continue;
        }
        throw error;
      } catch (error) {
        lastError = error;
        if (error instanceof ClickUpApiError || attempt === attempts) throw error;
      }
    }
    throw lastError;
  }

  private authorizationHeader(token: string): string {
    return token.startsWith("pk_") ? token : `Bearer ${token}`;
  }
}
