export interface Project {
  id: number;
  code: string;
  name: string;
  manager: string | null;
  start_date: string | null;
  target_end_date: string | null;
  business_status: string | null;
  sector?: string | null;
  companies?: string | null;
  description: string | null;
  exclude_bridge_days: boolean;
  status: "Draft" | "Final";
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  is_milestone: boolean;
  sorumlu: string | null;
  duration: number;
  start_date: string | null;
  end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  phase: string | null;
  priority: string | null;
  status: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: number;
  project_id: number;
  task_id: number;
  predecessor_id: number;
  dependency_type: string;
  created_at: string;
}

export interface ProjectAnswer {
  question_key: string;
  answer: string;
}

export interface ProjectAuditLog {
  id: number;
  project_id: number;
  action: string;
  details: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
  dependencies: TaskDependency[];
  answers: ProjectAnswer[];
  audit_logs?: ProjectAuditLog[];
}

export interface ExcelImportPreviewResult {
  filename: string;
  tasks_count: number;
  phase_counts: Record<string, number>;
  warnings: string[];
  has_existing_tasks: boolean;
  existing_tasks_count: number;
}

export interface PendingQuestion {
  type: "field_gap" | "extra_question";
  key: string;
  text: string;
  choices: string[] | null;
}

export interface ExcelImportResult {
  project: ProjectDetail;
  warnings: string[];
}

export interface CalendarDay {
  date: string;
  day_type: "WORK" | "WEEKEND" | "HOLIDAY" | "BRIDGE";
  name: string;
  warning: string | null;
}

export interface WBSWizardTaskInput {
  name: string;
  phase: string;
  description?: string;
  sorumlu?: string;
  priority: string;
  duration: number;
  is_milestone: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface WBSWizardQuestionDTO {
  key: string;
  category: string;
  question: string;
  description: string;
  icon_type: string;
  vendor_field_label?: string | null;
  current_answer: string | null;
  suggested_tasks: WBSWizardTaskInput[];
}

export interface WBSWizardApplyRequest {
  answers: Record<string, string>;
  tasks_to_create: WBSWizardTaskInput[];
}

export interface WBSWizardApplyResult {
  created_tasks_count: number;
  project: ProjectDetail;
}
