"""Tools the agents can call.

Every tool is scoped to a single workspace directory. That boundary is the
whole point: an agent can do what it likes inside the workspace and nothing
outside it. Run the whole thing inside Docker before you trust run_command.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

MAX_OUTPUT = 8000
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "dist", "build"}


class Workspace:
    """A sandboxed directory. All paths are resolved relative to root."""

    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def path(self, rel: str) -> Path:
        p = (self.root / rel).resolve()
        if p != self.root and self.root not in p.parents:
            raise ValueError(f"path escapes workspace: {rel}")
        return p


def _truncate(s: str) -> str:
    if len(s) <= MAX_OUTPUT:
        return s
    return s[:MAX_OUTPUT] + f"\n...[truncated {len(s) - MAX_OUTPUT} chars]"


# --- implementations --------------------------------------------------------

def list_files(ws: Workspace, path: str = ".") -> str:
    base = ws.path(path)
    if not base.exists():
        return f"ERROR: no such path: {path}"
    out = []
    for p in sorted(base.rglob("*")):
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        rel = p.relative_to(ws.root)
        out.append(f"{rel}/" if p.is_dir() else str(rel))
    return _truncate("\n".join(out) or "(empty workspace)")


def read_file(ws: Workspace, path: str) -> str:
    p = ws.path(path)
    if not p.is_file():
        return f"ERROR: no such file: {path}"
    lines = p.read_text(errors="replace").splitlines()
    return _truncate("\n".join(f"{i + 1}\t{line}" for i, line in enumerate(lines)))


def write_file(ws: Workspace, path: str, content: str) -> str:
    p = ws.path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    return f"wrote {path} ({len(content)} chars)"


def edit_file(ws: Workspace, path: str, old_str: str, new_str: str) -> str:
    p = ws.path(path)
    if not p.is_file():
        return f"ERROR: no such file: {path}"
    text = p.read_text()
    count = text.count(old_str)
    if count == 0:
        return "ERROR: old_str not found in file. Read the file again and match exactly."
    if count > 1:
        return f"ERROR: old_str matches {count} times. Add surrounding context to make it unique."
    p.write_text(text.replace(old_str, new_str))
    return f"edited {path}"


def search_code(ws: Workspace, pattern: str) -> str:
    args = ["grep", "-rn", "-I"]
    for d in SKIP_DIRS:
        args.append(f"--exclude-dir={d}")
    args += [pattern, "."]
    r = subprocess.run(args, cwd=ws.root, capture_output=True, text=True)
    return _truncate(r.stdout or "(no matches)")


def run_command(ws: Workspace, command: str, timeout: int = 300) -> str:
    try:
        r = subprocess.run(
            command, shell=True, cwd=ws.root,
            capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return f"ERROR: command timed out after {timeout}s"
    return _truncate(
        f"exit_code={r.returncode}\n--- stdout ---\n{r.stdout}\n--- stderr ---\n{r.stderr}"
    )


# --- schemas exposed to the model -------------------------------------------

SCHEMAS = {
    "list_files": {
        "name": "list_files",
        "description": "Recursively list files in the workspace. Use this first to orient yourself.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Directory relative to workspace root. Defaults to '.'"}},
        },
    },
    "read_file": {
        "name": "read_file",
        "description": "Read a file. Returns line-numbered content. Always read before editing.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
    },
    "write_file": {
        "name": "write_file",
        "description": "Create a file or overwrite it completely. Use edit_file for small changes.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
            "required": ["path", "content"],
        },
    },
    "edit_file": {
        "name": "edit_file",
        "description": "Replace one exact unique string in a file. old_str must appear exactly once.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old_str": {"type": "string"},
                "new_str": {"type": "string"},
            },
            "required": ["path", "old_str", "new_str"],
        },
    },
    "search_code": {
        "name": "search_code",
        "description": "grep the workspace for a pattern. Cheaper than reading many files.",
        "input_schema": {
            "type": "object",
            "properties": {"pattern": {"type": "string"}},
            "required": ["pattern"],
        },
    },
    "run_command": {
        "name": "run_command",
        "description": "Run a shell command in the workspace root. Use for installs, builds, tests, git.",
        "input_schema": {
            "type": "object",
            "properties": {"command": {"type": "string"}},
            "required": ["command"],
        },
    },
}

IMPLS = {
    "list_files": list_files,
    "read_file": read_file,
    "write_file": write_file,
    "edit_file": edit_file,
    "search_code": search_code,
    "run_command": run_command,
}


def schemas_for(names):
    return [SCHEMAS[n] for n in names]


def execute(name: str, args: dict, ws: Workspace) -> str:
    fn = IMPLS.get(name)
    if fn is None:
        return f"ERROR: unknown tool {name}"
    try:
        return fn(ws, **args)
    except Exception as e:  # noqa: BLE001 - agents must see the error, not crash the run
        return f"ERROR: {type(e).__name__}: {e}"
