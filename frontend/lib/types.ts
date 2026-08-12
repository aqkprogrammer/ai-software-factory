/**
 * Data model for the AI Software Factory.
 *
 * These types are the contract between the UI and the backend you have not
 * written yet. Every field here should map to a column or a JSON field in
 * Postgres — if something can't, it belongs in the UI layer, not in here.
 *
 * Naming is snake_case on the wire and camelCase in the client. Do the
 * conversion in one place (lib/api.ts), never per-component.
 */

/* ------------------------------------------------------------------ enums */

/** Employee state. Drives the status dot, the desk animation, and the filters. */
export type AgentStatus =
  | "working"    // executing tools against a repo
  | "thinking"   // planning, no tool calls in flight
  | "waiting"    // idle, no task assigned
  | "reviewing"  // reading someone else's output
  | "blocked"    // has a task but cannot proceed — dependency or missing input
  | "error"      // run failed and needs intervention
  | "offline";   // not provisioned for this project

export type AgentRole =
  | "cto" | "product_manager" | "business_analyst" | "architect"
  | "backend" | "frontend" | "database" | "qa"
  | "security" | "reviewer" | "devops" | "sre";

export type Department = "management" | "product" | "engineering" | "quality" | "infrastructure";

export type TaskStatus = "backlog" | "ready" | "running" | "review" | "blocked" | "completed" | "failed";

export type Priority = "low" | "medium" | "high" | "critical";

/**
 * Activity event types.
 *
 * These are deliberately coarse. They describe observable actions — a tool
 * call, a file write, a test result. They never carry model reasoning.
 * If you find yourself wanting a `reasoning` field here, that is the signal
 * you are about to leak chain-of-thought into the UI.
 */
export type ActivityEventType =
  | "task_assigned" | "task_started" | "task_completed" | "task_failed" | "task_blocked"
  | "tool_called" | "file_read" | "file_created" | "file_modified" | "search_performed"
  | "test_started" | "test_passed" | "test_failed"
  | "commit_created" | "pr_opened" | "review_submitted"
  | "deployment_started" | "deployment_completed" | "deployment_failed"
  | "approval_requested" | "approval_granted" | "approval_rejected"
  | "agent_status_changed";

export type EventCategory = "agent" | "code" | "test" | "git" | "deployment" | "error";

/* ----------------------------------------------------------------- agents */

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  roleLabel: string;
  department: Department;
  avatar?: string;
  status: AgentStatus;

  currentTaskId?: string;
  projectId?: string;
  /** 0–100. Progress on the current task, not on the project. */
  progress: number;
  /** One short line describing the observable action. Never reasoning. */
  currentActivity?: string;

  /** Desk coordinates in the office grid. Layout data, not business data. */
  location: { room: Department; gx: number; gy: number; facing: "n" | "e" | "s" | "w" };

  stats: AgentStats;
  lastEventAt?: string;
}

export interface AgentStats {
  tasksCompleted: number;
  tasksRemaining: number;
  filesChanged: number;
  testsRun: number;
  testsPassed: number;
  toolCalls: number;
  /** Seconds of wall-clock time spent executing, not elapsed since assignment. */
  activeSeconds: number;
  inputTokens: number;
  outputTokens: number;
  /** Denormalised for display. Recompute server-side; never trust the client. */
  estimatedCostUsd: number;
}

/* --------------------------------------------------------------- projects */

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  status: "discovery" | "building" | "review" | "deploying" | "live" | "paused";
  progress: number;
  repositoryUrl?: string;
  environment: "development" | "staging" | "production";
  createdAt: string;
  targetDate?: string;
  metrics: ProjectMetrics;
}

export interface ProjectMetrics {
  tasksTotal: number;
  tasksCompleted: number;
  tasksRunning: number;
  tasksBlocked: number;
  tasksFailed: number;
  agentsActive: number;
  filesChanged: number;
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  deployments: number;
  costUsd: number;
  /** Rolling 24h spend. The number that will surprise you in month two. */
  costUsdLast24h: number;
}

/* ------------------------------------------------------------------ tasks */

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedAgentId?: string;
  /** Task ids that must reach `completed` before this one can start. */
  dependsOn: string[];
  progress: number;
  checklist: ChecklistItem[];
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  filesChanged: string[];
  testsPassed?: number;
  testsTotal?: number;
  /** Set when status is `blocked` or `failed`. Shown verbatim in the UI. */
  blockedReason?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  state: "done" | "active" | "pending";
}

/* --------------------------------------------------------------- activity */

export interface ActivityEvent {
  id: string;
  timestamp: string;
  agentId: string;
  projectId: string;
  taskId?: string;
  type: ActivityEventType;
  category: EventCategory;
  /** Human-readable, already safe to render. Composed server-side. */
  message: string;
  /** Tool name, file path, test counts, exit codes. Never model reasoning. */
  metadata?: Record<string, unknown>;
}

/* --------------------------------------------------------------- workflow */

export interface WorkflowNode {
  id: string;
  projectId: string;
  label: string;
  stage: "requirements" | "architecture" | "database" | "backend" | "frontend"
       | "testing" | "security" | "staging" | "production";
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  assignedAgentId?: string;
  progress: number;
  durationSeconds?: number;
  dependsOn: string[];
}

/* ------------------------------------------------------- tests and deploys */

export interface TestRun {
  id: string;
  projectId: string;
  agentId: string;
  taskId?: string;
  suite: "unit" | "integration" | "e2e" | "security";
  command: string;
  status: "running" | "passed" | "failed";
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationSeconds: number;
  failures: TestFailure[];
  startedAt: string;
}

export interface TestFailure {
  name: string;
  file: string;
  /** Truncate server-side. Full traces belong in the log store, not the API. */
  message: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  environment: "staging" | "production";
  status: "pending" | "running" | "passed" | "failed" | "awaiting_approval";
  stages: DeploymentStage[];
  triggeredByAgentId?: string;
  approvedByUserId?: string;
  commitSha?: string;
  startedAt: string;
  completedAt?: string;
}

export interface DeploymentStage {
  name: "build" | "unit_tests" | "security_scan" | "docker_build"
      | "staging" | "e2e_tests" | "approval" | "production";
  status: "pending" | "running" | "passed" | "failed";
  durationSeconds?: number;
  logs?: string[];
}

/* -------------------------------------------------------------- approvals */

export interface Approval {
  id: string;
  projectId: string;
  type: "production_deployment" | "database_migration" | "security_change"
      | "infrastructure_change" | "client_visible_change";
  title: string;
  requestedByAgentId: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  /** Everything the human needs to decide, without opening another tab. */
  summary: {
    filesChanged: number;
    testsPassed: number;
    testsTotal: number;
    securityStatus: "passed" | "failed" | "skipped";
    infrastructureChanges: number;
    estimatedMonthlyCostDeltaUsd: number;
  };
  diffUrl?: string;
}

/* ------------------------------------------------------------ file changes */

export interface FileChange {
  id: string;
  projectId: string;
  taskId: string;
  agentId: string;
  path: string;
  changeType: "created" | "modified" | "deleted";
  linesAdded: number;
  linesRemoved: number;
  timestamp: string;
}

/* ------------------------------------------------------------ realtime bus */

/**
 * The single message envelope the WebSocket sends.
 *
 * The mock engine emits exactly this shape, so replacing it with a real
 * socket is a one-line change at the transport layer:
 *
 *   const ws = new WebSocket(`wss://api.yours/projects/${id}/stream`);
 *   ws.onmessage = (e) => dispatch(JSON.parse(e.data) as RealtimeMessage);
 */
export type RealtimeMessage =
  | { kind: "activity"; payload: ActivityEvent }
  | { kind: "agent_update"; payload: Pick<Agent, "id" | "status" | "progress" | "currentActivity" | "currentTaskId"> & { stats?: Partial<AgentStats> } }
  | { kind: "task_update"; payload: Partial<Task> & { id: string } }
  | { kind: "project_update"; payload: Partial<Project> & { id: string } }
  | { kind: "test_run"; payload: TestRun }
  | { kind: "deployment_update"; payload: Partial<Deployment> & { id: string } }
  | { kind: "approval_requested"; payload: Approval };
