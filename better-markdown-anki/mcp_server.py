"""Small local Streamable HTTP MCP server; Anki access runs on its UI thread."""
import concurrent.futures
import html
import json
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from .card_guidance import CARD_GUIDANCE
from .markdown_validation import validate_card

with open(os.path.join(os.path.dirname(__file__), 'manifest.json'), encoding='utf-8') as manifest_file:
    SERVER_VERSION = json.load(manifest_file).get('version', '0.0.0')

PROTOCOL = '2025-11-25'
VERSIONS = {'2025-03-26', '2025-06-18', PROTOCOL}
MAX_REQUEST = 2 * 1024 * 1024
MODEL_FIELDS = {
    'basic': ('Better Markdown : Basic', ('Front', 'Back', 'Extra', 'Difficulty')),
    'cloze': ('Better Markdown : Cloze', ('Text', 'Back Extra', 'Difficulty')),
}


def schema(properties=None, required=()):
    return {'type': 'object', 'properties': properties or {}, 'required': list(required), 'additionalProperties': False}


def tool(name, description, properties=None, required=(), readonly=False):
    return {'name': name, 'description': description, 'inputSchema': schema(properties, required),
            'annotations': {'readOnlyHint': readonly, 'destructiveHint': not readonly, 'openWorldHint': False}}


STRING = {'type': 'string'}
NOTE_ID = {'type': 'integer', 'minimum': 1}
FIELDS = {'type': 'object', 'additionalProperties': {'type': 'string'},
          'description': 'Plain Markdown field values, not HTML or HTML-escaped text.'}
TOOLS = [
    tool('card_authoring_guide', 'Read the public Better Markdown card-writing guide before creating cards.', readonly=True),
    tool('list_decks', 'List available Anki decks.', readonly=True),
    tool('validate_note', 'Check plain Markdown fields for common syntax errors and warnings before creating a note.',
         {'note_type': {'type': 'string', 'enum': ['basic', 'cloze']}, 'fields': FIELDS}, ('note_type', 'fields'), True),
    tool('find_notes', 'Search Better Markdown notes using Anki search syntax. Returns up to 100 note IDs.', {'query': STRING}, ('query',), True),
    tool('get_note', 'Read the stored fields, tags, and note type of one Better Markdown note.', {'note_id': NOTE_ID}, ('note_id',), True),
    tool('create_note', 'Create a Better Markdown note in an existing deck. Field values must be plain Markdown. Call card_authoring_guide first.',
         {'deck': STRING, 'note_type': {'type': 'string', 'enum': ['basic', 'cloze']}, 'fields': FIELDS,
          'tags': {'type': 'array', 'items': STRING}}, ('deck', 'note_type', 'fields')),
    tool('update_note', 'Replace only the specified fields on an existing Better Markdown note. Field values must be plain Markdown; get_note first.',
         {'note_id': NOTE_ID, 'fields': FIELDS}, ('note_id', 'fields')),
    tool('store_html_walkthrough', 'Store a self-contained HTML walkthrough in collection.media and return Markdown to embed it. Only use trusted HTML.',
         {'filename': STRING, 'html': STRING}, ('filename', 'html')),
]
TOOL_MAP = {item['name']: item for item in TOOLS}


def _validate(name, args):
    definition = TOOL_MAP.get(name)
    if not definition:
        raise ValueError('Unknown tool: ' + str(name))
    if not isinstance(args, dict):
        raise ValueError('arguments must be an object')
    spec = definition['inputSchema']
    missing = set(spec['required']) - set(args)
    unknown = set(args) - set(spec['properties'])
    if missing or unknown:
        raise ValueError('Invalid arguments: missing %s; unknown %s' % (sorted(missing), sorted(unknown)))
    for key, value in args.items():
        t = spec['properties'][key]['type']
        valid = {'string': lambda v: isinstance(v, str), 'integer': lambda v: isinstance(v, int) and not isinstance(v, bool) and v > 0,
                 'object': lambda v: isinstance(v, dict) and all(isinstance(k, str) and isinstance(x, str) for k, x in v.items()),
                 'array': lambda v: isinstance(v, list) and all(isinstance(x, str) for x in v)}[t](value)
        if not valid:
            raise ValueError('Invalid value for ' + key)
    if name in ('create_note', 'validate_note') and args['note_type'] not in MODEL_FIELDS:
        raise ValueError('note_type must be basic or cloze')


def _fields(note):
    note_type = note.note_type()
    name = note_type.get('name') if note_type else None
    if name not in [model for model, _ in MODEL_FIELDS.values()]:
        raise ValueError('Only Better Markdown notes are supported')
    return name, dict(note.items())


def _write_fields(note, fields, allowed):
    if not fields or set(fields) - set(allowed):
        raise ValueError('Supply at least one valid field: ' + ', '.join(allowed))
    for name, text in fields.items():
        # Fields are HTML to Anki. Escaping at the write boundary prevents the
        # editor or reviewer from parsing Markdown comparisons as HTML tags.
        note[name] = html.escape(text, quote=False)


def call_tool(name, args, col):
    _validate(name, args)
    if name == 'card_authoring_guide':
        return CARD_GUIDANCE
    if name == 'validate_note':
        return validate_card(args['note_type'], args['fields'])
    if col is None:
        raise ValueError('Open an Anki profile first')
    if name == 'list_decks':
        return col.decks.all_names()
    if name == 'find_notes':
        ids = col.find_notes(args['query'])
        # Limit returned IDs without filtering or touching other note types.
        results = []
        for nid in ids:
            try:
                _fields(col.get_note(nid))
                results.append(int(nid))
                if len(results) == 100:
                    break
            except ValueError:
                continue
        return {'note_ids': results, 'limit': 100}
    if name in ('get_note', 'update_note'):
        note = col.get_note(args['note_id'])
        model, fields = _fields(note)
        if name == 'get_note':
            return {'note_id': int(note.id), 'note_type': model, 'fields': fields,
                    'field_format': 'Anki HTML; may include Markdown and HTML entities', 'tags': list(note.tags)}
        kind = next(kind for kind, (model_, _) in MODEL_FIELDS.items() if model_ == model)
        allowed = MODEL_FIELDS[kind][1]
        validation = validate_card(kind, args['fields'], partial=True)
        if not validation['valid']:
            raise ValueError('Invalid card syntax: ' + json.dumps(validation['issues'], ensure_ascii=False))
        _write_fields(note, args['fields'], allowed)
        col.update_note(note)
        return {'note_id': int(note.id), 'updated_fields': list(args['fields']), 'validation': validation}
    if name == 'create_note':
        model_name, allowed = MODEL_FIELDS[args['note_type']]
        validation = validate_card(args['note_type'], args['fields'])
        if not validation['valid']:
            raise ValueError('Invalid card syntax: ' + json.dumps(validation['issues'], ensure_ascii=False))
        model = col.models.by_name(model_name)
        deck = col.decks.by_name(args['deck'])
        if not model or not deck:
            raise ValueError('The requested note type or deck does not exist')
        required = ('Front', 'Back') if args['note_type'] == 'basic' else ('Text',)
        if any(not args['fields'].get(field, '').strip() for field in required):
            raise ValueError('Required nonempty fields: ' + ', '.join(required))
        note = col.new_note(model)
        _write_fields(note, args['fields'], allowed)
        note.tags = args.get('tags', [])
        col.add_note(note, deck['id'])
        return {'note_id': int(note.id), 'note_type': model_name, 'deck': args['deck'], 'validation': validation}
    if name == 'store_html_walkthrough':
        filename = args['filename']
        if not re.fullmatch(r'_[A-Za-z0-9][A-Za-z0-9_.-]*\.html?', filename, re.I):
            raise ValueError('Use a single filename beginning with _ and ending in .html or .htm')
        data = args['html'].encode('utf-8')
        if len(data) > 1024 * 1024:
            raise ValueError('HTML walkthrough exceeds the 1 MiB limit')
        actual = col.media.write_data(filename, data)
        return {'filename': actual, 'markdown': '![Interactive walkthrough](%s)' % actual}
    raise ValueError('Unknown tool')


class MCPServer:
    def __init__(self, mw, port):
        self.mw = mw
        self.port = port
        self.httpd = None
        self.thread = None

    def _on_main(self, operation):
        future = concurrent.futures.Future()
        def run():
            if not future.set_running_or_notify_cancel():
                return
            try:
                future.set_result(operation(self.mw.col))
            except Exception as exc:
                future.set_exception(exc)
        self.mw.taskman.run_on_main(run)
        try:
            return future.result(timeout=30)
        except concurrent.futures.TimeoutError:
            future.cancel()
            raise RuntimeError('Anki did not respond in time; the operation may still complete if it has started')

    def dispatch(self, request):
        if not isinstance(request, dict) or request.get('jsonrpc') != '2.0' or not isinstance(request.get('method'), str):
            return {'jsonrpc': '2.0', 'id': None, 'error': {'code': -32600, 'message': 'Invalid Request'}}
        method, ident = request['method'], request.get('id')
        if 'id' not in request:
            return None
        def response(result): return {'jsonrpc': '2.0', 'id': ident, 'result': result}
        params = request.get('params', {})
        if not isinstance(params, dict):
            return {'jsonrpc': '2.0', 'id': ident, 'error': {'code': -32602, 'message': 'Invalid params'}}
        if method == 'initialize':
            requested = params.get('protocolVersion')
            return response({'protocolVersion': requested if requested in VERSIONS else PROTOCOL,
                             'capabilities': {'tools': {}},
                             'serverInfo': {'name': 'better-markdown-anki', 'version': SERVER_VERSION},
                             'instructions': 'Call card_authoring_guide for public card-writing and Markdown guidance.'})
        if method == 'ping': return response({})
        if method == 'tools/list': return response({'tools': TOOLS})
        if method == 'tools/call':
            try:
                name, args = params.get('name'), params.get('arguments', {})
                _validate(name, args)
                result = call_tool(name, args, None) if name in ('card_authoring_guide', 'validate_note') else self._on_main(lambda col: call_tool(name, args, col))
                output = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)
                return response({'content': [{'type': 'text', 'text': output}], 'isError': False})
            except Exception as exc:
                return response({'content': [{'type': 'text', 'text': str(exc)}], 'isError': True})
        return {'jsonrpc': '2.0', 'id': ident, 'error': {'code': -32601, 'message': 'Method not found'}}

    def start(self):
        owner = self
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass  # Never log tokens or note contents.
            def send_json(self, status, body=None):
                data = b'' if body is None else json.dumps(body, ensure_ascii=False).encode('utf-8')
                self.send_response(status)
                if data: self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                if data: self.wfile.write(data)
            def authorized(self):
                if self.path != '/mcp': self.send_json(404); return False
                host = self.headers.get('Host', '').lower()
                if host not in ('127.0.0.1:%d' % owner.port, 'localhost:%d' % owner.port):
                    self.send_json(421); return False
                origin = self.headers.get('Origin')
                if origin:
                    parsed = urlsplit(origin)
                    if parsed.scheme not in ('http', 'https') or parsed.hostname not in ('127.0.0.1', 'localhost') or parsed.username or parsed.password:
                        self.send_json(403); return False
                version = self.headers.get('MCP-Protocol-Version')
                if version and version not in VERSIONS: self.send_json(400); return False
                return True
            def do_GET(self):
                if self.authorized(): self.send_json(405)
            def do_DELETE(self):
                if self.authorized(): self.send_json(405)
            def do_POST(self):
                if not self.authorized(): return
                if self.headers.get_content_type() != 'application/json': self.send_json(415); return
                try:
                    size = int(self.headers.get('Content-Length', '-1'))
                    if size < 0 or size > MAX_REQUEST: self.send_json(413); return
                    self.connection.settimeout(10)
                    request = json.loads(self.rfile.read(size))
                except (ValueError, UnicodeDecodeError, OSError):
                    self.send_json(400); return
                result = owner.dispatch(request)
                self.send_json(200 if result is not None else 202, result)
        self.httpd = ThreadingHTTPServer(('127.0.0.1', self.port), Handler)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, name='bma-mcp', daemon=True)
        self.thread.start()

    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()
            self.httpd = None
