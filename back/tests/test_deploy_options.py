from pathlib import Path
from deploy_test_support import DisposableWorkspace as TemporaryDirectory
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from deploy_options import DeployOptions, build_paths, safe_error


class DeployOptionsTests(unittest.TestCase):
    def test_invalid_contracts_are_rejected(self):
        for patch in ({'app_port': 70000}, {'app_port': True}, {'health_path': '/ok;rm -rf /'}, {'health_path': '//other'}, {'context_dir': '../secret'}, {'dockerfile': '/Dockerfile'}, {'context_dir': 'C:\\secret'}, {'git_branch': '--upload-pack=x'}, {'git_branch': 'refs/../x'}, {'memory_mb': 1}, {'cpus': float('nan')}, {'cpus': True}, {'start_command': ['']}, {'surprise': True}):
            with self.subTest(patch=patch), self.assertRaises(ValueError): DeployOptions(**patch)

    def test_nested_context_and_error_redaction(self):
        with TemporaryDirectory(dir=Path(__file__).resolve().parent, prefix='deploy-options-') as directory:
            root = Path(directory)
            context, dockerfile = build_paths(root, DeployOptions(context_dir='apps/site', dockerfile='docker/Prod'))
            self.assertEqual(context, root.resolve() / 'apps/site')
            self.assertEqual(dockerfile, context / 'docker/Prod')
        text = safe_error('secret-token https://user:password@example.invalid/repo', ['secret-token'])
        self.assertNotIn('secret-token', text); self.assertNotIn('password', text)
        text = safe_error('https://user-token@example.invalid/repo?access_token=another-secret', [])
        self.assertNotIn('user-token', text); self.assertNotIn('another-secret', text)
