"""WMK Bridge v0.2.3: local-only HTTP adapter for the existing GridCraft control protocol."""
import argparse
import hmac
import json
import os
from pathlib import Path
import secrets
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent
VERSION = "0.5.2"
MAX_BODY = 64 * 1024
ALLOWED = {'cell.get', 'sheet.read', 'document.inspect', 'window.list'}


def read_control_token(port):
    token = os.getenv('GRIDCRAFT_CONTROL_TOKEN')
    if token:
        return token
    path = Path.home() / '.gridcraft' / f'control-{port}.token'
    if not path.is_file():
        raise FileNotFoundError(f'Token nao encontrado: {path}. Inicie o WMK Formula com --control {port}.')
    return path.read_text(encoding='utf-8').strip()


def call_control(port, token, method, params):
    with socket.create_connection(('127.0.0.1', port), timeout=5) as conn:
        conn.settimeout(10)
        with conn.makefile('rwb') as stream:
            for payload in (
                {'id': 0, 'method': 'auth', 'params': {'token': token}},
                {'id': 1, 'method': method, 'params': params},
            ):
                stream.write((json.dumps(payload, ensure_ascii=False) + '\n').encode())
                stream.flush()
                raw = stream.readline(4 * 1024 * 1024)
                if not raw:
                    raise ConnectionError('O WMK Formula fechou a conexao')
                response = json.loads(raw)
                if not response.get('ok'):
                    raise RuntimeError(str(response.get('error', 'Erro no protocolo de controle')))
            return response.get('result')


def create_handler(control_port, control_token, web_token, web_port):
    origin = f'http://127.0.0.1:{web_port}'
    class Handler(BaseHTTPRequestHandler):
        def send_json(self, code, obj):
            data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-WMK-Version', VERSION)
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'none'")
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            path = urlsplit(self.path).path
            if path == '/':
                path = '/index.html'
            if path == '/api/v1/health':
                return self.send_json(200, {'ok': True, 'version': VERSION, 'control_port': control_port, 'web_port': web_port})
            files = {'/index.html': ('index.html', 'text/html; charset=utf-8'),
                     '/app.js': ('app.js', 'application/javascript; charset=utf-8'),
                     '/style.css': ('style.css', 'text/css; charset=utf-8'),
                     '/studio.js': ('studio.js', 'application/javascript; charset=utf-8'),
                     '/runner.html': ('runner.html', 'text/html; charset=utf-8'),
                     '/designer.html': ('designer.html', 'text/html; charset=utf-8'),
                     '/designer.js': ('designer.js', 'application/javascript; charset=utf-8'),
                     '/designer-crud.js': ('designer-crud.js', 'application/javascript; charset=utf-8'),
                     '/designer.css': ('designer.css', 'text/css; charset=utf-8')}
            # WMK public docs and artwork: whitelisted routes (no arbitrary file reads).
            docs = {"/manuais/" + name: (BASE / "manuais" / name, "text/css; charset=utf-8" if name.endswith(".css") else "text/html; charset=utf-8")
                    for name in ('manual.css', 'manual-completo.html', 'inicio.html', 'designer.html', 'crud.html', 'javascript.html', 'componentes.html', 'plugins.html', 'licenciamento.html', 'publicacao.html')}
            docs.update({"/assets/wmk-formula-logo.png": (BASE / "web" / "assets" / "wmk-formula-logo.png", "image/png"),
                         "/assets/wmk-formula-icon.png": (BASE / "web" / "assets" / "wmk-formula-icon.png", "image/png"),
                         "/assets/wmk-paleta-oficial.png": (BASE / "web" / "assets" / "wmk-paleta-oficial.png", "image/png")})
            if path in docs:
                filename, mime = docs[path]
                data = filename.read_bytes()
                filename = filename.name
            else:
                if path not in files:
                    return self.send_json(404, {'error': 'Nao encontrado'})
                filename, mime = files[path]
                data = (BASE / 'web' / filename).read_bytes()
            if filename in ('index.html', 'designer.html'):
                data = data.replace(b'__WMK_WEB_TOKEN__', web_token.encode())
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-WMK-Version', VERSION)
            self.send_header('X-Content-Type-Options', 'nosniff')
            if filename == 'runner.html':
                self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; form-action 'none'; base-uri 'none'")
            else:
                self.send_header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' data: https://cdn.jsdelivr.net; worker-src blob: data:; child-src blob:; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            if self.path != '/api/v1/command':
                return self.send_json(404, {'error': 'Nao encontrado'})
            if self.headers.get('Origin') != origin or self.headers.get('Sec-Fetch-Site') == 'cross-site':
                return self.send_json(403, {'error': 'Origem nao autorizada'})
            if not hmac.compare_digest(self.headers.get('X-WMK-Token', ''), web_token):
                return self.send_json(403, {'error': 'Token invalido'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= MAX_BODY:
                    return self.send_json(413, {'error': 'Tamanho de requisicao invalido'})
                body = json.loads(self.rfile.read(length))
                if not isinstance(body, dict) or not isinstance(body.get('params', {}), dict):
                    return self.send_json(400, {'error': 'JSON invalido'})
                method = body.get('method')
                params = body.get('params', {})
                if method == 'cell.set':
                    cell, value = params.get('cell'), params.get('input')
                    if not isinstance(cell, str) or not isinstance(value, str) or len(cell) > 128 or len(value) > 8192:
                        return self.send_json(400, {'error': 'Celula ou valor invalido'})
                    method, params = 'engine.execute', {'command': 'cell.set', 'params': {'cell': cell, 'input': value}}
                elif method not in ALLOWED:
                    return self.send_json(403, {'error': 'Metodo nao permitido na versao 0.1'})
                result = call_control(control_port, control_token, method, params)
                return self.send_json(200, {'ok': True, 'result': result})
            except (ValueError, json.JSONDecodeError) as exc:
                return self.send_json(400, {'error': str(exc)})
            except (OSError, RuntimeError, ConnectionError) as exc:
                return self.send_json(502, {'error': str(exc)})

        def log_message(self, fmt, *args):
            print('[HTTP]', fmt % args)
    return Handler


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--control', type=int, default=7979)
    p.add_argument('--port', type=int, default=8768)
    args = p.parse_args()
    if not (1024 <= args.port <= 65535 and 1024 <= args.control <= 65535):
        p.error('Portas invalidas')
    required = ['index.html', 'app.js', 'studio.js', 'style.css', 'runner.html', 'designer.html', 'designer.js', 'designer.css']
    missing = [f for f in required if not (BASE / 'web' / f).is_file()]
    if missing:
        p.error('Arquivos web ausentes: ' + ', '.join(missing) + '. Extraia o ZIP completo.')
    control_token = read_control_token(args.control)
    web_token = secrets.token_urlsafe(32)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), create_handler(args.control, control_token, web_token, args.port))
    print(f'WMK Bridge v{VERSION} em http://127.0.0.1:{args.port} (Ctrl+C para parar)', flush=True)
    server.serve_forever()

if __name__ == '__main__':
    main()
