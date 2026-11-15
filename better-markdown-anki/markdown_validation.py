"""Conservative syntax checks for the MCP's plain-Markdown input.

Warnings are heuristics, not a replacement for rendering a card in Anki.
"""
import re

FIELDS = {
    'basic': ('Front', 'Back', 'Extra', 'Difficulty'),
    'cloze': ('Text', 'Back Extra', 'Difficulty'),
}
FENCE = re.compile(r'^ {0,3}(`{3,}|~{3,})(.*)$')
CLOZE_TOKEN = re.compile(r'\{\{c(\d+)::|\}\}')


def validate_card(note_type, fields, partial=False):
    issues = []
    def add(field, severity, message):
        issues.append({'field': field, 'severity': severity, 'message': message})

    if note_type not in FIELDS:
        return {'valid': False, 'issues': [{'field': None, 'severity': 'error', 'message': 'note_type must be basic or cloze'}]}
    if not isinstance(fields, dict) or not fields or not all(isinstance(k, str) and isinstance(v, str) for k, v in fields.items()):
        return {'valid': False, 'issues': [{'field': None, 'severity': 'error', 'message': 'fields must contain string field values'}]}
    for field in fields:
        if field not in FIELDS[note_type]: add(field, 'error', 'Unknown field for this note type')
    for field in (('Front', 'Back') if note_type == 'basic' else ('Text',)):
        if (not partial or field in fields) and not fields.get(field, '').strip():
            add(field, 'error', 'Required field is empty or missing')

    for field, content in fields.items():
        outside = []
        fence_char, fence_size = None, 0
        for line in content.splitlines(keepends=True):
            candidate = FENCE.match(line.rstrip('\r\n'))
            if fence_char:
                if candidate and candidate.group(1)[0] == fence_char and len(candidate.group(1)) >= fence_size and not candidate.group(2).strip():
                    fence_char = None
                outside.append('\n')
            elif candidate:
                fence_char, fence_size = candidate.group(1)[0], len(candidate.group(1))
                if fence_char == '`' and '`' in candidate.group(2):
                    add(field, 'warning', 'Backticks in a code fence info string may prevent Markdown parsing')
                outside.append('\n')
            else:
                outside.append(line)
        if fence_char:
            add(field, 'error', 'Unclosed fenced code block')

        # Ignore inline code and escaped dollars; unmatched dollars are warnings
        # because currency and literal text can legitimately contain them.
        prose = re.sub(r'(`+)(?!`)([^\n]*?)(?<!`)\1(?!`)', '', ''.join(outside))
        dollars = re.findall(r'(?<!\\)\$\$|(?<!\\)\$', prose)
        if dollars.count('$$') % 2: add(field, 'warning', 'Unpaired display math delimiter ($$); check the equation')
        if dollars.count('$') % 2: add(field, 'warning', 'Unpaired inline math delimiter ($); escape literal dollars if needed')
        if re.search(r'\$[^\n$]*\{\{c\d+::', prose):
            add(field, 'warning', 'Keep cloze deletions outside math delimiters for reliable rendering')

    if note_type == 'cloze' and 'Text' in fields:
        text = fields['Text']
        stack = []
        count = 0
        for token in CLOZE_TOKEN.finditer(text):
            if token.group(1) is not None:
                count += 1
                if int(token.group(1)) == 0: add('Text', 'error', 'Cloze indices start at c1')
                stack.append(token.start())
            elif stack:
                start = stack.pop()
                if re.fullmatch(r'\{\{c\d+::\s*(?:::[^}]*)?\}\}', text[start:token.end()]):
                    add('Text', 'error', 'Cloze deletion has an empty answer')
        if stack: add('Text', 'error', 'Unclosed cloze deletion')
        if not count: add('Text', 'error', 'Cloze Text needs at least one deletion such as {{c1::answer}}')

    return {'valid': not any(item['severity'] == 'error' for item in issues), 'issues': issues}
