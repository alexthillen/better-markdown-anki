// Parse nested deletions before rendering so an inner `}}` cannot close its parent.
function parseClozes(text) {
    const tokens = /{{c([1-9]\d*)::|}}|::/g;
    let cursor = 0;

    function parse(inCloze = false) {
        const answer = [];
        let hint = null;
        let parts = answer;
        let match;
        while ((match = tokens.exec(text)) !== null) {
            parts.push(text.slice(cursor, match.index));
            cursor = tokens.lastIndex;
            if (match[1]) {
                const child = parse(true);
                if (!child.closed) {
                    // Preserve unfinished syntax while the user is typing.
                    parts.push(text.slice(match.index));
                    return { answer, hint, closed: false };
                }
                parts.push({ number: Number(match[1]), ...child });
            } else if (inCloze && match[0] === '}}') {
                return { answer, hint, closed: true };
            } else if (inCloze && match[0] === '::' && hint === null) {
                hint = [];
                parts = hint;
            } else {
                parts.push(match[0]);
            }
        }
        parts.push(text.slice(cursor));
        cursor = text.length;
        return { answer, hint, closed: false };
    }

    return parse().answer;
}

// A null ordinal previews every deletion; numbered card previews use zero-based ordinals.
export function clozeHtml(text, ordinal, side) {
    function render(parts, renderSide) {
        return parts.map(part => {
            if (typeof part === 'string') return part;
            const answer = render(part.answer, renderSide);
            const active = ordinal === null || part.number === ordinal + 1;
            if (!active) {
                return `<span class="cloze-inactive" data-ordinal="${part.number}">${answer}</span>`;
            }
            if (renderSide === 'back') {
                return `<span class="cloze" data-ordinal="${part.number}">${answer}</span>`;
            }
            const hint = part.hint ? render(part.hint, 'back') : '';
            const placeholder = hint ? `[${hint}]` : '[...]';
            return `<span class="cloze" data-cloze="${encodeURIComponent(answer)}" data-ordinal="${part.number}">${placeholder}</span>`;
        }).join('');
    }

    return render(parseClozes(text), side);
}
