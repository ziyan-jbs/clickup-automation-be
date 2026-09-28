export interface ClickUpAuthorizedUser {
  user: { id: number; username: string; email: string };
}

export interface ClickUpWorkspaceDto {
  id: string;
  name: string;
}

export interface ClickUpTaskDto {
  id: string;
  name: string;
  status: { status: string; type?: string };
  assignees?: Array<{ id: number }>;
  list?: { id: string; name: string };
  space?: { id: string; name: string };
  due_date?: string | null;
  date_updated?: string | null;
  url: string;
  time_spent?: number | string | null;
}

export interface ClickUpTimeEntryDto {
  id: string;
  start: string;
  duration: string;
  task?: { id: string };
}

export class ClickUpApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}
