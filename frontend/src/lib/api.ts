import type {
  CalendarDay,
  ExcelImportResult,
  PendingQuestion,
  Project,
  ProjectDetail,
  Task,
  TaskDependency,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  missingDatesTaskIds?: number[];
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `İstek başarısız oldu (${res.status})`;
    let missingDatesTaskIds: number[] | undefined;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (data.detail?.message) {
        message = data.detail.message;
        missingDatesTaskIds = data.detail.missing_dates_task_ids;
      }
    } catch {
      // response body wasn't JSON; keep the generic message
    }
    const error = new ApiError(message);
    error.missingDatesTaskIds = missingDatesTaskIds;
    throw error;
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  listProjects: () => apiFetch<Project[]>("/projects"),
  createProject: (data: {
    code: string;
    name: string;
    manager?: string;
    start_date?: string;
    target_end_date?: string;
    business_status?: string;
    description?: string;
  }) => apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
  getProject: (id: number) => apiFetch<ProjectDetail>(`/projects/${id}`),
  deleteProject: (id: number) => apiFetch<void>(`/projects/${id}`, { method: "DELETE" }),
  scheduleProject: (id: number) => apiFetch<ProjectDetail>(`/projects/${id}/schedule`, { method: "POST" }),
  finalizeProject: (id: number) =>
    apiFetch<{ status: string; missing_dates_task_ids: number[] }>(`/projects/${id}/finalize`, { method: "POST" }),

  createTask: (
    projectId: number,
    data: {
      name: string;
      description?: string;
      is_milestone?: boolean;
      sorumlu?: string;
      phase?: string;
      priority?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      actual_start_date?: string;
      actual_end_date?: string;
    }
  ) => apiFetch<Task>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
  updateTask: (taskId: number, data: Partial<Task>) =>
    apiFetch<Task>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (taskId: number) => apiFetch<void>(`/tasks/${taskId}`, { method: "DELETE" }),

  createDependency: (projectId: number, data: { task_id: number; predecessor_id: number }) =>
    apiFetch<TaskDependency>(`/projects/${projectId}/dependencies`, { method: "POST", body: JSON.stringify(data) }),
  deleteDependency: (id: number) => apiFetch<void>(`/dependencies/${id}`, { method: "DELETE" }),

  reimportExcel: (projectId: number, file: File, overwrite: boolean) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<ExcelImportResult>(`/projects/${projectId}/import?overwrite=${overwrite}`, {
      method: "POST",
      body: form,
    });
  },

  getCalendarDetails: (startDate: string, endDate: string) =>
    apiFetch<CalendarDay[]>(`/calendar/details?start_date=${startDate}&end_date=${endDate}`),

  getQuestions: (projectId: number) => apiFetch<PendingQuestion[]>(`/projects/${projectId}/questions`),
  answerQuestion: (projectId: number, key: string, value: string) =>
    apiFetch<PendingQuestion>(`/projects/${projectId}/questions/answer`, {
      method: "POST",
      body: JSON.stringify({ key, value }),
    }),
};
