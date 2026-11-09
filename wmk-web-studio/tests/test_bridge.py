import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bridge

class BridgeTests(unittest.TestCase):
    def test_token_environment(self):
        with patch.dict('os.environ', {'GRIDCRAFT_CONTROL_TOKEN': 'fake-test-token'}):
            self.assertEqual(bridge.read_control_token(7979), 'fake-test-token')
    def test_methods_restricted(self):
        self.assertIn('cell.get', bridge.ALLOWED)
        self.assertNotIn('app.quit', bridge.ALLOWED)
        self.assertNotIn('engine.execute', bridge.ALLOWED)
    def test_assets_present(self):
        for file in ['index.html','app.js','style.css']:
            self.assertTrue((bridge.BASE/'web'/file).is_file())
    def test_invalid_port(self):
        self.assertEqual(bridge.MAX_BODY, 65536)

if __name__ == '__main__': unittest.main()
