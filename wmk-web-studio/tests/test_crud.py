from pathlib import Path
import unittest
BASE=Path(__file__).resolve().parents[1]
class CrudChecks(unittest.TestCase):
 def test_crud_assets_and_actions(self):
  js=(BASE/'web/designer-crud.js').read_text()
  for marker in ['crudAppend','crudUpdate','crudDelete','crudFind','crudReload','crudSelectedRow','crudWritePair','crudStart']:
   self.assertIn(marker,js)
 def test_no_fixed_write_to_a1(self):
  js=(BASE/'web/designer-crud.js').read_text()
  self.assertNotIn("cell:'A1'",js)
 def test_html_assets(self):
  html=(BASE/'web/designer.html').read_text()
  for field in ['crud-add','crud-delete','crud-update','crud-find','designer-crud.js']:
   self.assertIn(field,html)
