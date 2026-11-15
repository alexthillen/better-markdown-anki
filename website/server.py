"""Serve the guide and the add-on's real, locally built renderer on loopback."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

HERE = Path(__file__).resolve().parent
DIST = HERE.parent / 'better-markdown-anki' / 'dist'

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        request_path = unquote(urlsplit(path).path)
        if request_path.startswith('/addon/'):
            candidate = (DIST / request_path[len('/addon/'):]).resolve()
            if candidate != DIST and DIST in candidate.parents:
                return str(candidate)
            return str(HERE / '__not_found__')
        return super().translate_path(path)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4178)
    args = parser.parse_args()
    httpd = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(HERE)))
    print('Local guide: http://127.0.0.1:%d/' % args.port, flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
