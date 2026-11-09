"""Contract tests for the WMK 0.5 docking UI."""
import unittest
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]/'web'
class DockingContract(unittest.TestCase):
    def test_splitters_and_restore_are_present(self):
        html=(BASE/'designer.html').read_text()
        for id_ in ['workspace','split-left','split-right','split-console','split-inspector','console-toggle','console-clear','layout-reset']:
            self.assertIn(f'id="{id_}"',html)
    def test_previous_form_data_is_migrated(self):
        js=(BASE/'designer.js').read_text()
        self.assertIn("wmk-form-designer-v040",js)
        self.assertIn("wmk-form-designer-v030",js)
        self.assertIn("wmk-workspace-layout-v051",js)
    def test_script_bridge_is_preserved(self):
        js=(BASE/'designer.js').read_text()
        for api in ['cell.get','cell.set','/api/v1/command']:
            self.assertIn(api,js)
if __name__=='__main__':unittest.main()
