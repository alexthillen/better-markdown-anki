"""Protect Markdown fenced code before Anki's webviews parse field HTML."""
import json
import re

# Some Anki fields encode line breaks as <br>. Cloze rendering adds spans
# that must remain elements for hints and toggles to work.
_MARKUP = re.compile(r'(?i)<br\s*/?>|<span\b[^>]*>|</span\s*>')
_FENCE = re.compile(r'(?P<fence>`{3,}|~{3,})[^\n<]*?(?:\n|(?=<br\s*/?>)|(?=<div\b))(?P<body>[\s\S]*?)(?P=fence)(?![`~])', re.IGNORECASE)
_ENTITY = re.compile(r'&(?!#\d+;|#x[\da-fA-F]+;|[a-zA-Z][a-zA-Z0-9]+;)')
_ANKI_CLOZE_ATTRIBUTE = re.compile(r'(?i)\sdata-(?:cloze|ordinal)\s*=')
_CLASS_ATTRIBUTE = re.compile(r'(?i)\sclass\s*=\s*(["\'])(.*?)\1')


def _escape_text(text):
    text = _ENTITY.sub('&amp;', text)
    return text.replace('<', '&lt;').replace('>', '&gt;')


def protect_fenced_code(value, preserve_rendered_clozes=False):
    def protect(match):
        body = match.group('body')
        parts = []
        start = 0
        span_stack = []
        html_breaks = bool(re.match(r'(?i)<br\s*/?>', body))
        for tag in _MARKUP.finditer(body):
            parts.append(_escape_text(body[start:tag.start()]))
            markup = tag.group()
            if re.match(r'(?i)<br', markup):
                parts.append(markup if html_breaks else _escape_text(markup))
            elif re.match(r'(?i)</span', markup):
                is_cloze = span_stack.pop() if span_stack else False
                parts.append(markup if is_cloze else _escape_text(markup))
            else:
                classes = _CLASS_ATTRIBUTE.search(markup)
                is_cloze = bool(preserve_rendered_clozes and classes
                                and {'cloze', 'cloze-inactive'}.intersection(classes.group(2).lower().split())
                                and _ANKI_CLOZE_ATTRIBUTE.search(markup))
                span_stack.append(is_cloze)
                parts.append(markup if is_cloze else _escape_text(markup))
            start = tag.end()
        parts.append(_escape_text(body[start:]))
        return value[match.start():match.start('body')] + ''.join(parts) + match.group('fence')
    return _FENCE.sub(protect, value)


def protect_editor_fields(js, note, editor):
    if not note or not re.search(r'Better Markdown|SnapDeck', note.note_type()['name'], re.I):
        return js
    # Anki sends a JSON array to setFields; alter only the webview payload,
    # never the note object or collection. JSONDecoder handles nested strings.
    marker = 'setFields('
    start = js.find(marker)
    if start < 0:
        return js
    start += len(marker)
    try:
        fields, size = json.JSONDecoder().raw_decode(js[start:])
        protected = [[name, protect_fenced_code(value)] for name, value in fields]
    except (ValueError, TypeError):
        return js
    return js[:start] + json.dumps(protected) + js[start + size:]


def protect_review_html(content, card, kind):
    note_type = card.note().note_type()
    if note_type and re.search(r'Better Markdown|SnapDeck', note_type['name'], re.I):
        return protect_fenced_code(content, preserve_rendered_clozes=True)
    return content
