"""Disposable in-repository workspaces; normal ACLs also work in Windows sandbox."""
from pathlib import Path
import shutil
import uuid


class DisposableWorkspace:
    def __init__(self, dir=None, prefix='deploy-test-'):
        parent = Path(dir or Path(__file__).resolve().parent).resolve()
        assert parent == Path(__file__).resolve().parent
        path = parent / (prefix + uuid.uuid4().hex)
        path.mkdir(mode=0o777)
        self.name = str(path)

    def cleanup(self):
        path = Path(self.name)
        assert path.resolve().parent == Path(__file__).resolve().parent and not path.is_symlink()
        if path.exists(): shutil.rmtree(path)

    def __enter__(self): return self.name
    def __exit__(self, *_args): self.cleanup()
