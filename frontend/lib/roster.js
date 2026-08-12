/** The office roster and its furniture.
 *
 *  Desk ids must match `office_id` on the backend agents, or an event arrives
 *  with nowhere to sit. Four of these are implemented today; the rest are
 *  deliberately empty desks.
 */

export const ROOMS = [
  { id: "management",     label: "Management",     gx: 0,  gy: 0,  w: 4,  h: 4, tint: "#4C1D95" },
  { id: "product",        label: "Product",        gx: 4,  gy: 0,  w: 8,  h: 4, tint: "#1E3A8A" },
  { id: "engineering",    label: "Engineering",    gx: 0,  gy: 4,  w: 7,  h: 6, tint: "#164E63" },
  { id: "quality",        label: "Quality",        gx: 7,  gy: 4,  w: 5,  h: 6, tint: "#312E81" },
  { id: "infrastructure", label: "Infrastructure", gx: 0,  gy: 10, w: 12, h: 3, tint: "#134E4A" },
];

export const STAFF = [
  { id: "cto",       name: "Atlas",  role: "AI CTO",            room: "management",     gx: 1.6, gy: 1.6, standing: true, live: true },
  { id: "pm",        name: "Iris",   role: "Product Manager",   room: "product",        gx: 5.4, gy: 1.4 },
  { id: "analyst",   name: "Sol",    role: "Business Analyst",  room: "product",        gx: 8.8, gy: 1.4 },
  { id: "architect", name: "Vector", role: "System Architect",  room: "engineering",    gx: 0.9, gy: 5.1 },
  { id: "backend",   name: "Forge",  role: "Backend Engineer",  room: "engineering",    gx: 3.9, gy: 5.1, live: true },
  { id: "database",  name: "Quarry", role: "Database Engineer", room: "engineering",    gx: 0.9, gy: 7.9 },
  { id: "frontend",  name: "Lumen",  role: "Frontend Engineer", room: "engineering",    gx: 3.9, gy: 7.9 },
  { id: "qa",        name: "Sieve",  role: "QA Engineer",       room: "quality",        gx: 7.9, gy: 5.1, live: true },
  { id: "security",  name: "Aegis",  role: "Security Engineer", room: "quality",        gx: 10.4, gy: 5.1 },
  { id: "reviewer",  name: "Lens",   role: "Code Reviewer",     room: "quality",        gx: 7.9, gy: 7.9, live: true },
  { id: "devops",    name: "Pylon",  role: "DevOps Engineer",   room: "infrastructure", gx: 2.6, gy: 11.1 },
  { id: "sre",       name: "Beacon", role: "SRE",               room: "infrastructure", gx: 7.6, gy: 11.1 },
];

export const DESKS = STAFF.map((p) => p.id);
export const byId = Object.fromEntries(STAFF.map((p) => [p.id, p]));

/** Fallback headline when no live task is assigned to a desk. */
export const IDLE_TASK = {
  cto: "Waiting for a requirement",
  pm: "Write acceptance criteria",
  analyst: "Map the current workflow",
  architect: "Define service boundaries",
  backend: "Waiting for a task",
  database: "Model the domain",
  frontend: "Build the dashboard",
  qa: "Waiting for an implementation",
  security: "Audit token handling",
  reviewer: "Waiting for a diff",
  devops: "Wire CI and container build",
  sre: "Configure staging alerting",
};

export const CHECKLIST = {
  backend: ["Analyse architecture", "Inspect database schema", "Create auth service",
            "Implement JWT middleware", "Write integration tests", "Security review", "Open pull request"],
  frontend: ["Read API contracts", "Build table component", "Wire data fetching",
             "Empty and error states", "Responsive pass", "Open pull request"],
  qa: ["Read implementation", "Write happy path tests", "Write failure cases",
       "Run suite", "Report failures", "Re-run after fix"],
  cto: ["Read the requirement", "Break down the work", "Assign the tasks", "Supervise", "Sign off"],
  reviewer: ["Read the diff", "Check contracts", "Check error handling", "Submit verdict"],
};

export const DEFAULT_CHECKLIST = ["Load project context", "Inspect existing work",
                                  "Implement change", "Validate output", "Hand off"];

export const FILES = {
  cto: ["PLAN.md", "tasks.json"], pm: ["acceptance-criteria.md"], analyst: ["workflow-map.md"],
  architect: ["ARCHITECTURE.md", "api-contracts.json"],
  backend: ["auth/service.py", "auth/middleware.py", "api/deals.py"],
  database: ["models/deal.py", "migrations/0007_deals.sql"],
  frontend: ["app/deals/page.tsx", "components/DealTable.tsx"],
  qa: ["tests/test_auth.py", "tests/test_deals.py"],
  security: ["auth/middleware.py", ".env.example"], reviewer: ["auth/middleware.py"],
  devops: ["Dockerfile", ".github/workflows/ci.yml"], sre: ["alerts/staging.yaml"],
};

export const COMMANDS = {
  backend: "pytest tests/test_auth.py -q", qa: "pytest tests/ -q", frontend: "npm run build",
  database: "alembic upgrade head", devops: "docker build -t crm-api .",
  security: "bandit -r api/ auth/", sre: "kubectl get pods -n staging",
  reviewer: "git diff --stat", architect: "git log --oneline -5",
  cto: "git log --oneline -5", pm: "ls docs/", analyst: "ls docs/",
};

/** The pipeline the backend actually runs, as a graph. */
export const PIPELINE = [
  { id: "requirements", label: "Requirements", agent: "cto",      x: 0, y: 0, needs: [] },
  { id: "plan",         label: "Task plan",    agent: "cto",      x: 0, y: 1, needs: ["requirements"] },
  { id: "code",         label: "Implementation", agent: "backend", x: -1, y: 2, needs: ["plan"] },
  { id: "tests",        label: "Test suite",   agent: "qa",       x: 1, y: 2, needs: ["plan"] },
  { id: "fix",          label: "Fix loop",     agent: "backend",  x: 0, y: 3, needs: ["code", "tests"] },
  { id: "review",       label: "Code review",  agent: "reviewer", x: 0, y: 4, needs: ["fix"] },
  { id: "approval",     label: "Human approval", agent: null,     x: 0, y: 5, needs: ["review"] },
  { id: "production",   label: "Production",   agent: null,       x: 0, y: 6, needs: ["approval"] },
];

export const FILTERS = [
  { id: "all", label: "All" }, { id: "agent", label: "Agents" }, { id: "code", label: "Code" },
  { id: "test", label: "Tests" }, { id: "git", label: "Git" },
  { id: "deployment", label: "Deploy" }, { id: "error", label: "Errors" },
];
