"""Smoke test for the tool layer. Runs without an API key."""
import tempfile

from agency import tools


def main():
    with tempfile.TemporaryDirectory() as d:
        ws = tools.Workspace(d)

        assert "wrote" in tools.write_file(ws, "src/app.py", "def hello():\n    return 1\n")
        assert "def hello" in tools.read_file(ws, "src/app.py")
        assert "src/app.py" in tools.list_files(ws)
        assert "app.py" in tools.search_code(ws, "hello")

        assert "edited" in tools.edit_file(ws, "src/app.py", "return 1", "return 2")
        assert "return 2" in tools.read_file(ws, "src/app.py")
        assert "ERROR" in tools.edit_file(ws, "src/app.py", "not_present", "x")

        out = tools.run_command(ws, "python3 -c \"import sys; sys.path.insert(0,'src'); import app; print(app.hello())\"")
        assert "exit_code=0" in out and "2" in out, out

        # the sandbox boundary must hold
        assert "ERROR" in tools.execute("read_file", {"path": "../../../etc/passwd"}, ws)
        assert "ERROR" in tools.execute("write_file", {"path": "/tmp/escape", "content": "x"}, ws)

        print("all tool tests passed")


if __name__ == "__main__":
    main()
