#!/usr/bin/env python3
"""CLI entrypoint.

    export ANTHROPIC_API_KEY=sk-ant-...
    python run.py "Build a FastAPI task API with users, auth, projects and tasks on SQLite" \
        --workspace ./workspace/task-api

No key yet? Prove the pipeline's plumbing first, for free:

    python run.py --demo
"""
import argparse
import sys

from agency.llm import MissingAPIKey


def main():
    ap = argparse.ArgumentParser(description="Run the agent pipeline against a workspace.")
    ap.add_argument("requirement", nargs="?", help="What to build, in plain English.")
    ap.add_argument("--workspace", "-w", default="./workspace", help="Directory the agents may modify.")
    ap.add_argument("--fix-attempts", type=int, default=2, help="Test/fix rounds before giving up.")
    ap.add_argument("--demo", action="store_true",
                    help="Scripted run with no model calls. Checks the wiring, builds nothing.")
    args = ap.parse_args()

    if args.demo:
        from agency import demo
        print("demo run: no API key used, no files written\n")
        demo.run()
        print("\ndemo finished")
        return

    if not args.requirement:
        ap.error("give a requirement, or pass --demo")

    print(f"workspace: {args.workspace}")
    print("agents can read, write and execute anything in that directory. Ctrl-C to abort.\n")
    try:
        from agency.orchestrator import build
        build(args.requirement, args.workspace, args.fix_attempts)
    except MissingAPIKey as e:
        print(f"\n{e}\n\nOr run `python run.py --demo` to check the pipeline without a key.")
        sys.exit(2)
    except KeyboardInterrupt:
        print("\naborted")
        sys.exit(130)


if __name__ == "__main__":
    main()
