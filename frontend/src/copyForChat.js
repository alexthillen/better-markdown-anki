const LOCAL_HTML = /^[^/\\:?#]+\.html?$/i;
const MEDIA_TIMEOUT_MS = 1500;

async function loadMedia(filename, fetchFile) {
    const controller = new AbortController();
    let timer;
    try {
        return await Promise.race([
            (async () => {
                const response = await fetchFile(filename, { signal: controller.signal });
                if (!response.ok) throw new Error(String(response.status));
                return response.text();
            })(),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    controller.abort();
                    reject(new Error('Media request timed out'));
                }, MEDIA_TIMEOUT_MS);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}


function fieldText(value) {
    if (!value) return '';
    const template = document.createElement('template');
    template.innerHTML = value;
    template.content.querySelectorAll('iframe').forEach(frame => {
        const src = frame.getAttribute('src') || '';
        frame.replaceWith(document.createTextNode(`![${frame.title || 'Walkthrough'}](${src})`));
    });
    template.content.querySelectorAll('img').forEach(img => {
        img.replaceWith(document.createTextNode(`![${img.alt || 'Image'}](${img.getAttribute('src') || ''})`));
    });
    template.content.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    template.content.querySelectorAll('div,p,li').forEach(el => el.append('\n'));
    return template.content.textContent.trim();
}

export async function buildChatText(fields, fetchFile = fetch) {
    const missing = [];
    const cache = new Map();
    async function expand(value) {
        const field = fieldText(value);
        const matches = [...field.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        const replacements = await Promise.all(matches.map(async match => {
            const filename = match[2];
            let decoded;
            try { decoded = decodeURIComponent(filename); } catch { return match[0]; }
            if (!LOCAL_HTML.test(filename) || !LOCAL_HTML.test(decoded)) return match[0];
            if (!cache.has(filename)) {
                cache.set(filename, loadMedia(filename, fetchFile).catch(() => {
                    missing.push(filename);
                    return null;
                }));
            }
            const source = await cache.get(filename);
            const longestRun = source?.match(/`+/g)?.reduce((n, run) => Math.max(n, run.length), 0) || 0;
            const fence = '`'.repeat(Math.max(4, longestRun + 1));
            return source === null
                ? `[HTML walkthrough unavailable: ${filename}]`
                : `HTML walkthrough (${filename}):\n\n${fence}html\n${source}\n${fence}`;
        }));
        let result = field;
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            result = result.slice(0, match.index) + replacements[i] + result.slice(match.index + match[0].length);
        }
        return result;
    }
    const sections = await Promise.all(['front', 'back', 'extra'].map(key => expand(fields[key])));
    return {
        text: `I want to chat about the following Flashcard:\n\n# Front\n\n${sections[0]}\n\n# Back\n\n${sections[1]}\n\n# Extra\n\n${sections[2]}`,
        missing,
    };
}
