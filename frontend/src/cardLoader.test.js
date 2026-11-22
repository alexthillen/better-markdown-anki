import { describe, expect, it } from 'vitest';
import loader from '../../better-markdown-anki/templates/script.html?raw';

function loadCard(protocol, userAgent) {
    const added = [];
    const document = {
        createElement: (tag) => ({ tag, setAttribute() {} }),
        head: { appendChild: (node) => added.push(node) },
        querySelector: () => null,
    };
    const script = loader.replace(/^<script>\s*/, '').replace(/\s*<\/script>\s*$/, '');
    new Function('document', 'location', 'navigator', script)(document, { protocol }, { userAgent });
    return added;
}

describe('card asset loader', () => {
    it.each([
        ['Android phone', 'http:', 'Mozilla/5.0 (Linux; Android 14; Pixel) Mobile'],
        ['Android tablet', 'http:', 'Mozilla/5.0 (Linux; Android 13; SM-T570)'],
        ['file-based mobile client', 'file:', 'Mozilla/5.0'],
    ])('loads mobile assets first on %s', (_name, protocol, userAgent) => {
        const assets = loadCard(protocol, userAgent);
        expect(assets.find((asset) => asset.tag === 'script')).toMatchObject({
            src: '_better_markdown_anki_mobile.js',
        });
        expect(assets[0].href).toBe('_better_markdown_anki_mobile.css');
    });

    it('keeps the desktop add-on assets and module loader', () => {
        const assets = loadCard('http:', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)');
        expect(assets.find((asset) => asset.tag === 'script')).toMatchObject({
            src: '/_addons/{ADDON_PACKAGE}/dist/_better_markdown_anki.js',
            type: 'module',
        });
        expect(assets[0].href).toContain('/_addons/');
    });
});
