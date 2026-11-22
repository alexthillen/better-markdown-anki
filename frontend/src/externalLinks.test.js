import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleExternalLink } from './externalLinks';

afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
});

function click(href) {
    const anchor = document.createElement('a');
    anchor.setAttribute('href', href);
    document.body.appendChild(anchor);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.addEventListener('click', handleExternalLink);
    anchor.dispatchEvent(event);
    return event.defaultPrevented;
}

describe('external link bridge', () => {
    it.each(['obsidian://open', 'notion://www.notion.so/'])('forwards %s when the desktop bridge is present', (url) => {
        document.body.innerHTML = '<span id="bma-external-url-bridge" hidden></span>';
        const send = vi.fn();
        vi.stubGlobal('pycmd', send);
        expect(click(url)).toBe(true);
        expect(send).toHaveBeenCalledWith(`bma-open-url:${url}`);
    });

    it.each(['obsidian://open', 'notion://www.notion.so/'])('leaves mobile %s clicks alone even if another pycmd exists', (url) => {
        const send = vi.fn();
        vi.stubGlobal('pycmd', send);
        expect(click(url)).toBe(false);
        expect(send).not.toHaveBeenCalled();
    });

    it('leaves links alone if the bridge function is unavailable', () => {
        document.body.innerHTML = '<span id="bma-external-url-bridge" hidden></span>';
        expect(click('obsidian://open')).toBe(false);
    });

    it('does not intercept other links', () => {
        document.body.innerHTML = '<span id="bma-external-url-bridge" hidden></span>';
        const send = vi.fn();
        vi.stubGlobal('pycmd', send);
        expect(click('#section')).toBe(false);
        expect(click('https://example.com')).toBe(false);
        expect(send).not.toHaveBeenCalled();
    });
});
