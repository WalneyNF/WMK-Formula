import sys,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.request import urlopen
import threading
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import bridge
class DesignerTest(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls.server=ThreadingHTTPServer(('127.0.0.1',0),bridge.create_handler(7979,'token','web-token',0));cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.port=cls.server.server_address[1]
  @classmethod
  def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join(timeout=2)
  def test_assets(self):
    for name in ['designer.html','designer.js','designer.css']:
      with urlopen(f'http://127.0.0.1:{self.port}/{name}') as r:
        self.assertEqual(r.status,200)
        self.assertIn('0.5.2',r.headers['X-WMK-Version'])
  def test_token_only_in_html(self):
    with urlopen(f'http://127.0.0.1:{self.port}/designer.html') as r:
      self.assertIn('web-token',r.read().decode())
    with urlopen(f'http://127.0.0.1:{self.port}/designer.js') as r:
      self.assertNotIn('web-token',r.read().decode())
if __name__=='__main__':unittest.main()
