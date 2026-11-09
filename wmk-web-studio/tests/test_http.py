import json
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import bridge

class HttpChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),bridge.create_handler(7979,'fake-control-token','fake-web-token',0))
        # Handler is bound to origin port 0 for this test; POST origin=http://127.0.0.1:0 is fine for synthetic request
        cls.port=cls.server.server_address[1]
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join(timeout=2)
    def fetch(self,path):
        return urlopen(f'http://127.0.0.1:{self.port}{path}',timeout=3)
    def test_health_version(self):
        r=self.fetch('/api/v1/health'); d=json.load(r)
        self.assertEqual(d['version'],'0.5.2')
        self.assertEqual(r.headers['X-WMK-Version'],'0.5.2')
    def test_runner_exists_and_eval_is_isolated(self):
        r=self.fetch('/runner.html')
        self.assertEqual(r.status,200)
        self.assertIn("'unsafe-eval'",r.headers['Content-Security-Policy'])
        self.assertIn('AsyncFunction',r.read().decode())
    def test_main_page_does_not_allow_eval(self):
        r=self.fetch('/')
        csp=r.headers['Content-Security-Policy']
        self.assertNotIn('unsafe-eval',csp)
        self.assertIn('style-src-elem',csp)
        self.assertIn('https://cdn.jsdelivr.net',csp)
        self.assertIn('0.5.2',r.read().decode())
    def test_all_assets_present(self):
        for asset in ['/app.js','/style.css','/studio.js','/runner.html','/designer.html','/designer.js','/designer-crud.js','/designer.css']:
            self.assertEqual(self.fetch(asset).status,200,asset)
    def test_wrong_token_rejected(self):
        data=json.dumps({'method':'cell.get','params':{'cell':'A1'}}).encode()
        req=Request(f'http://127.0.0.1:{self.port}/api/v1/command',data=data,headers={'Origin':'http://127.0.0.1:0','X-WMK-Token':'wrong','Content-Type':'application/json'})
        with self.assertRaises(HTTPError) as e: urlopen(req)
        self.assertEqual(e.exception.code,403)
    def test_valid_read_reaches_control(self):
        data=json.dumps({'method':'cell.get','params':{'cell':'A1'}}).encode()
        req=Request(f'http://127.0.0.1:{self.port}/api/v1/command',data=data,headers={'Origin':'http://127.0.0.1:0','X-WMK-Token':'fake-web-token','Content-Type':'application/json'})
        with patch.object(bridge,'call_control',return_value={'value':777}) as f:
            d=json.load(urlopen(req))
        self.assertEqual(d['result']['value'],777)
        f.assert_called_once_with(7979,'fake-control-token','cell.get',{'cell':'A1'})
    def test_valid_write_uses_engine(self):
        data=json.dumps({'method':'cell.set','params':{'cell':'B1','input':'1554'}}).encode()
        req=Request(f'http://127.0.0.1:{self.port}/api/v1/command',data=data,headers={'Origin':'http://127.0.0.1:0','X-WMK-Token':'fake-web-token','Content-Type':'application/json'})
        with patch.object(bridge,'call_control',return_value={'cell':'B1'}) as f:
            d=json.load(urlopen(req))
        self.assertTrue(d['ok'])
        f.assert_called_once_with(7979,'fake-control-token','engine.execute',{'command':'cell.set','params':{'cell':'B1','input':'1554'}})

if __name__ == '__main__': unittest.main()
