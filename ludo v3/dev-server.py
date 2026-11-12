"""Static dev server for the Ludo board that disables browser caching.

`python -m http.server` sends Last-Modified but no Cache-Control, so Chrome
caches the ES modules heuristically and keeps running stale game code after an
edit -- you get errors like "LudoDebug.scenarios.almostWin is not a function"
even though the file on disk is correct. Serving everything with `no-store`
means an ordinary reload always picks up the latest code.

Usage:
    python dev-server.py [port] [directory]

Defaults to port 8915 serving the folder this file sits in, so the game is at
http://localhost:8915/dist/index.html
"""

import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8915
    directory = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(
        os.path.abspath(__file__)
    )

    handler = partial(NoCacheHandler, directory=directory)

    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print("serving %s" % directory)
        print("game at http://localhost:%d/dist/index.html" % port)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
