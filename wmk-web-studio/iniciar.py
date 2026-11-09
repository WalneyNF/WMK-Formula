"""Inicializador unico da WMK Bridge v0.5.2."""
import os
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

DIR = Path(__file__).resolve().parent
PORT_CONTROL = 7979
PORT_WEB = 8773  # porta exclusiva da v0.5.2: evita confundir com servidor antigo 8767
FORMULA = Path(r'D:\Ferramentas\gridcraft\target\debug\WMK-Formula.exe')
URL = f'http://127.0.0.1:{PORT_WEB}'

def listening(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=0.7):
            return True
    except OSError:
        return False

def main():
    print('=' * 53)
    print(' WMK BRIDGE + CODE STUDIO  |  VERSAO 0.5.2')
    print('=' * 53)
    if listening(PORT_WEB):
        print(f'ERRO: porta {PORT_WEB} ja ocupada. Nao vou abrir uma versao desconhecida.')
        return 1
    if not listening(PORT_CONTROL):
        if not FORMULA.is_file():
            print(f'ERRO: WMK Formula nao encontrado: {FORMULA}')
            return 1
        print('Iniciando WMK Formula ...')
        subprocess.Popen([str(FORMULA), '--control', str(PORT_CONTROL)], cwd=str(FORMULA.parent))
        for _ in range(40):
            if listening(PORT_CONTROL):
                break
            time.sleep(0.5)
    if not listening(PORT_CONTROL):
        print('ERRO: o WMK Formula nao abriu a porta de controle 7979.')
        return 1
    token = Path.home() / '.gridcraft' / 'control-7979.token'
    if not token.is_file() and not os.getenv('GRIDCRAFT_CONTROL_TOKEN'):
        print(f'ERRO: token de controle nao encontrado: {token}')
        return 1
    print(f'Iniciando Bridge v0.5.2 em {URL} ...')
    proc = subprocess.Popen([sys.executable, str(DIR/'bridge.py'), '--control', str(PORT_CONTROL), '--port', str(PORT_WEB)], cwd=str(DIR))
    try:
        for _ in range(40):
            if proc.poll() is not None:
                print('ERRO: Bridge terminou antes de abrir a porta.')
                return 1
            try:
                with urllib.request.urlopen(URL+'/api/v1/health', timeout=1) as response:
                    import json
                    data=json.load(response)
                    if data.get('version')!='0.5.2':
                        print('ERRO: versão da Bridge diferente da esperada:',data)
                        return 1
                    break
            except Exception:
                time.sleep(0.25)
        else:
            print('ERRO: servidor nao passou no teste /api/v1/health.')
            return 1
        print('VERSAO CONFIRMADA: 0.5.2')
        print('Pagina: '+URL)
        print('Para encerrar a Bridge, feche esta janela ou pressione Ctrl+C.')
        webbrowser.open(URL+'/?v=0.5.2')
        proc.wait()
        return proc.returncode or 0
    except KeyboardInterrupt:
        print('Encerrando Bridge...')
        return 0
    finally:
        if proc.poll() is None:
            proc.terminate()
            try: proc.wait(timeout=3)
            except subprocess.TimeoutExpired: proc.kill()

if __name__ == '__main__':
    sys.exit(main())
