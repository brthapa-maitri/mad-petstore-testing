"""Stdlib stub of contracts/petstore-pets.yaml, used only to self-test tests/contract/run.sh."""
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

STATUSES = {"available", "pending", "sold"}
PETS = {}
ID_RE = re.compile(r"^[0-9]{1,19}$")


def invalid_new_pet(body):
    if not isinstance(body, dict) or set(body) - {"name", "status", "category"}:
        return True
    name, status, cat = body.get("name"), body.get("status"), body.get("category")
    if not isinstance(name, str) or not 1 <= len(name) <= 100 or not isinstance(status, str) or status not in STATUSES:
        return True
    if "category" in body and (not isinstance(cat, dict) or set(cat) != {"name"}
                            or not isinstance(cat["name"], str) or not 1 <= len(cat["name"]) <= 50):
        return True
    return False


class Handler(BaseHTTPRequestHandler):
    def send(self, code, payload, headers=()):
        data = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        for name, value in headers:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/pet":
            return self.method_not_allowed()
        if url.path == "/pet/findByStatus":
            values = parse_qs(url.query).get("status", [])
            if len(values) != 1 or values[0] not in STATUSES:
                return self.send(422, {"detail": "status must be one of available, pending, sold"})
            return self.send(200, [p for p in PETS.values() if p["status"] == values[0]])
        m = re.fullmatch(r"/pet/([^/]+)", url.path)
        if m:
            pet_id = m.group(1)
            if not ID_RE.match(pet_id):
                return self.send(422, {"detail": "petId must be a decimal string"})
            return self.send(200, PETS[pet_id]) if pet_id in PETS else self.send(404, {"detail": "not found"})
        self.send(404, {"detail": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path.startswith("/pet/"):
            return self.method_not_allowed()
        if path != "/pet":
            return self.send(404, {"detail": "not found"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"null")
        except ValueError:
            return self.send(422, {"detail": "invalid JSON"})
        if invalid_new_pet(body):
            return self.send(422, {"detail": "invalid pet"})
        pet = {"id": str(9007199254740993 + len(PETS)), **body}
        PETS[pet["id"]] = pet
        self.send(200, pet)

    def method_not_allowed(self):
        allow = "POST" if urlparse(self.path).path == "/pet" else "GET"
        self.send(405, {"detail": "method not allowed"}, [("Allow", allow)])

    def __getattr__(self, name):
        if name.startswith("do_"):
            return self.method_not_allowed
        raise AttributeError(name)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", int(sys.argv[1])), Handler).serve_forever()
