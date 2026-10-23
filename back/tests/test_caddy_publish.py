"""Route replacement contract, without a running Caddy or network calls."""
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

import httpx


class CaddyPublishTests(unittest.TestCase):
    def load_client(self):
        config = types.ModuleType('config')
        config.settings = types.SimpleNamespace(
            base_domain='example.invalid', caddy_server='srv0',
            caddy_admin_url='http://caddy.invalid:2019', guest_app_port=8080,
        )
        spec = importlib.util.spec_from_file_location('caddy_test_client', Path(__file__).resolve().parents[1] / 'caddy.py')
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'config': config}):
            spec.loader.exec_module(module)
        return module

    def test_existing_route_is_replaced_without_deleting_it(self):
        caddy = self.load_client()
        client = MagicMock()
        client.get.return_value.status_code = 200
        with patch.object(caddy.httpx, 'Client') as factory:
            factory.return_value.__enter__.return_value = client
            caddy.upsert_route('alpha', upstream='alpha_release_9:3000')
        client.patch.assert_called_once()
        route = client.patch.call_args.kwargs['json']
        self.assertEqual(route['handle'][0]['upstreams'][0]['dial'], 'alpha_release_9:3000')
        client.delete.assert_not_called()
        client.post.assert_not_called()

    def test_unavailable_config_does_not_insert_duplicate_route(self):
        caddy = self.load_client()
        client = MagicMock()
        client.get.return_value = httpx.Response(503, request=httpx.Request('GET', 'http://caddy.invalid/id/project_alpha'))
        with patch.object(caddy.httpx, 'Client') as factory:
            factory.return_value.__enter__.return_value = client
            with self.assertRaises(httpx.HTTPStatusError):
                caddy.upsert_route('alpha', upstream='alpha_release_9:3000')
        client.patch.assert_not_called()
        client.post.assert_not_called()


if __name__ == '__main__':
    unittest.main()
