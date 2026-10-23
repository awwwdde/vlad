"""Engine argument/health checks without Docker, Git, network or real workspaces."""
from pathlib import Path
import subprocess
import sys
import unittest


def isolated_check():
    import importlib.util
    from deploy_test_support import DisposableWorkspace
    import types
    from unittest.mock import patch
    root = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(root))
    workspace = DisposableWorkspace(dir=root / 'tests', prefix='deploy-test-')
    assert Path(workspace.name).resolve().is_relative_to((root / 'tests').resolve())
    config = types.ModuleType('config'); config.settings = types.SimpleNamespace(workspaces_dir=workspace.name, docker_network='test-network', base_domain='example.invalid', guest_app_port=8080)
    docker = types.ModuleType('docker'); errors = types.ModuleType('docker.errors'); docker_types = types.ModuleType('docker.types')
    class NotFound(Exception): pass
    class APIError(Exception): pass
    errors.NotFound = NotFound; errors.ImageNotFound = type('ImageNotFound', (Exception,), {}); errors.APIError = APIError
    docker_types.LogConfig = lambda **kwargs: kwargs
    sys.modules.update(config=config, docker=docker, **{'docker.errors': errors, 'docker.types': docker_types})
    spec = importlib.util.spec_from_file_location('deploy_engine_under_test', root / 'engine.py')
    engine = importlib.util.module_from_spec(spec); sys.modules[spec.name] = engine; spec.loader.exec_module(engine)
    from deploy_options import DeployOptions
    calls = []
    def missing(name): raise NotFound()
    engine._client = types.SimpleNamespace(containers=types.SimpleNamespace(get=missing, run=lambda **kwargs: calls.append(kwargs)), images=types.SimpleNamespace(build=lambda **kwargs: calls.append(kwargs)))
    options = DeployOptions(app_port=3000, memory_mb=512, cpus=.5, pids_limit=128, start_command=['node', 'server.js'], database_enabled=False, no_cache=True, pull_base_image=True)
    engine.run_app('alpha', 'test-image', 'unused-db', secret_key='test-key', jwt_secret='test-jwt', extra_env={'MODE': 'test'}, options=options)
    args = calls[-1]
    assert args['mem_limit'] == '512m' and args['nano_cpus'] == 500000000 and args['pids_limit'] == 128
    assert args['command'] == ['node', 'server.js'] and args['environment']['PORT'] == '3000'
    assert 'DATABASE_URL' not in args['environment'] and args['log_config']['config']['max-size'] == '10m'
    removed = []
    engine._client.containers.get = lambda name: types.SimpleNamespace(remove=lambda **kwargs: removed.append(name))
    engine.run_app('alpha', 'release-image', '', secret_key='test-key', jwt_secret='test-jwt', options=options, container_name='alpha_release_12', release_id=12)
    assert removed == ['alpha_release_12'], 'Candidate must not remove active app'
    assert calls[-1]['name'] == 'alpha_release_12' and calls[-1]['labels']['awwwdde.release'] == '12'
    engine._client.containers.get = missing
    folder = Path(workspace.name) / 'alpha'; nested = folder / 'apps/site/docker'; nested.mkdir(parents=True); (nested / 'Prod').write_text('FROM scratch')
    engine.build_image('alpha', folder, DeployOptions(context_dir='apps/site', dockerfile='docker/Prod', no_cache=True, pull_base_image=True))
    assert calls[-1]['path'] == str(folder / 'apps/site') and calls[-1]['dockerfile'] == 'docker/Prod' and calls[-1]['nocache'] is True and calls[-1]['pull'] is True
    streamed = []
    def build_stream(**kwargs):
        calls.append(kwargs)
        yield {'stream': 'Step 1/2\n'}
        yield {'error': 'compiler failed'}
    engine._client.api = types.SimpleNamespace(build=build_stream)
    try: engine.build_image('alpha', folder, DeployOptions(context_dir='apps/site', dockerfile='docker/Prod'), image_tag='awwwdde/alpha:release-99', log=streamed.append)
    except engine.DeployError: pass
    else: raise AssertionError('Docker build error swallowed')
    assert streamed == ['Step 1/2\n', 'compiler failed\n']
    assert calls[-1]['decode'] is True and calls[-1]['tag'].endswith('release-99')
    marker = folder / 'preserved'; marker.write_text('keep')
    try: engine.prepare_source('alpha', workspace.name)
    except engine.DeployError: pass
    else: raise AssertionError('Overlapping source allowed')
    assert marker.read_text() == 'keep'
    local_source = Path(workspace.name) / 'local-source'; local_source.mkdir(); (local_source / 'Dockerfile').write_text('FROM scratch')
    with patch.object(engine.shutil, 'copytree', side_effect=OSError('test copy failure')):
        try: engine.prepare_source('alpha', str(local_source))
        except OSError: pass
        else: raise AssertionError('Failed copy succeeded')
    assert marker.read_text() == 'keep'
    (folder / '.git').mkdir()
    commands = []
    with patch.object(engine.subprocess, 'run', side_effect=lambda args, **kwargs: (commands.append(args) or types.SimpleNamespace(stdout='', stderr=''))):
        engine.prepare_source('alpha', 'https://example.invalid/test.git', DeployOptions(git_branch='staging'))
        assert any(cmd[-1] == 'staging' and 'fetch' in cmd for cmd in commands)
        commands.clear(); engine.prepare_source('alpha', 'https://example.invalid/test.git')
        assert any(cmd[-1] == 'HEAD' and 'fetch' in cmd for cmd in commands)
    now = [0]
    engine.time = types.SimpleNamespace(monotonic=lambda: now[0], sleep=lambda seconds: now.__setitem__(0, now[0] + seconds))
    def response(value):
        return types.SimpleNamespace(status='running', exec_run=lambda args: (0, value))
    engine._client.containers.get = lambda name: response(b'HTTP/1.1 301 Redirect\nHTTP/1.1 200 OK')
    try: engine.wait_healthy('alpha', options=DeployOptions(health_timeout=10, health_interval=1))
    except engine.DeployError as exc: assert '301' in str(exc)
    else: raise AssertionError('Redirect accepted as HTTP 200')
    engine._client.containers.get = lambda name: response(b'HTTP_CODE=201')
    engine.wait_healthy('alpha', options=DeployOptions(health_status=201))
    workspace.cleanup()


class DeployEngineTests(unittest.TestCase):
    def test_config_reaches_docker_and_strict_readiness(self):
        result = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--isolated'], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    if '--isolated' in sys.argv: isolated_check()
    else: unittest.main()
