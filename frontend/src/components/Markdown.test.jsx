import { MantineProvider } from '@mantine/core';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Markdown from './Markdown';

vi.mock('viewerjs', () => ({
    default: class Viewer {
        update() {}
        destroy() {}
    },
}));

window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
}));

function renderMarkdown(markdown) {
    return render(
        <MantineProvider>
            <Markdown allowHtml>{markdown}</Markdown>
        </MantineProvider>,
    ).container;
}

describe('Markdown', () => {
    it('renders GFM tables', () => {
        const container = renderMarkdown(
            '| Q | col1 | col2 |<div>|---|---|---|</div><div>| r1 | r1c1 | r1c2 |</div><div>| r2 | r2c1 | r2c2 |</div>',
        );

        expect(container.querySelector('table')).not.toBeNull();
        expect(container.querySelectorAll('th')).toHaveLength(3);
        expect(container.querySelectorAll('td')).toHaveLength(6);
    });

    it('renders standalone dollar math in display mode', () => {
        const container = renderMarkdown('$$\\Sigma$$');

        expect(container.querySelector('.katex-display')).not.toBeNull();
    });

    it('keeps inline math inline', () => {
        const container = renderMarkdown('Before $\\Sigma$ after');

        expect(container.querySelector('.katex')).not.toBeNull();
        expect(container.querySelector('.katex-display')).toBeNull();
    });

    it('preserves nested lists from editor HTML line breaks', () => {
        const container = renderMarkdown('- parent<div>    - child</div>');

        expect(container.querySelectorAll('ul')).toHaveLength(2);
    });

    it('renders blockquotes encoded by the Anki editor', () => {
        const container = renderMarkdown('&gt; quoted');

        expect(container.querySelector('blockquote')).not.toBeNull();
    });

    it('renders markdown images', () => {
        const container = renderMarkdown('![diagram](https://example.com/diagram.png)');

        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/diagram.png');
    });

    it('preserves angle brackets and following content in fenced code', () => {
        const container = renderMarkdown('```text\nnums[dq[-1]]&lt;val\n```\n\n**after**');
        expect(container.textContent).toContain('nums[dq[-1]]<val');
        expect(container.querySelector('strong')?.textContent).toBe('after');
    });

    it('renders MCP-escaped code symbols literally without losing following text', () => {
        const container = renderMarkdown('```html\n&lt;div&gt;x &amp;&amp; y&lt;/div&gt;\n```\n\nAfter.');
        expect(container.textContent).toContain('<div>x && y</div>');
        expect(container.textContent).toContain('After.');
    });

    it('embeds a local HTML walkthrough in a sandbox', () => {
        const container = renderMarkdown('![Walkthrough](_walkthrough.html)');
        const frame = container.querySelector('iframe');
        expect(frame?.getAttribute('src')).toBe('_walkthrough.html');
        expect(frame?.getAttribute('sandbox')).toBe('allow-scripts');
    });

    it('expands and closes a walkthrough without replacing the iframe', () => {
        const container = renderMarkdown('![Walkthrough](_walkthrough.html)');
        const frame = container.querySelector('iframe');
        fireEvent.click(container.querySelector('[aria-label="Expand walkthrough"]'));
        expect(container.querySelector('iframe')).toBe(frame);
        expect(frame.parentElement.style.position).toBe('fixed');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(container.querySelector('iframe')).toBe(frame);
        expect(frame.parentElement.style.position).toBe('relative');
    });

    it('renders math nested in editor HTML', () => {
        const container = renderMarkdown('<mark>$x$</mark>');

        expect(container.querySelector('mark .katex')).not.toBeNull();
    });

    it('shows the per-card cloze index beside its hint', () => {
        const container = renderMarkdown('<span class="cloze" data-cloze="answer" data-cloze-index="2" data-ordinal="7">[formula]</span>');

        expect(container.querySelector('.cloze')?.textContent).toBe('[formula]2');
        expect(container.querySelector('.bma-cloze-index')?.getAttribute('aria-label')).toBe('Cloze 2');
    });

    it('does not label inactive clozes', () => {
        const container = renderMarkdown('<span class="cloze-inactive" data-ordinal="2">answer</span>');

        expect(container.querySelector('.bma-cloze-index')).toBeNull();
    });

    it('does not label revealed clozes on the back', () => {
        const container = renderMarkdown('<span class="cloze" data-ordinal="2">answer</span>');

        expect(container.querySelector('.bma-cloze-index')).toBeNull();
    });

    it('keeps additional-protocol links such as obsidian:// clickable', () => {
        const container = renderMarkdown('[open note](obsidian://open?vault=main&file=note.md)');

        const anchor = container.querySelector('a');
        expect(anchor).not.toBeNull();
        expect(anchor.getAttribute('href')).toBe('obsidian://open?vault=main&file=note.md');
    });

    it('still strips javascript: URLs from links', () => {
        const container = renderMarkdown('[click](javascript:alert(1))');

        const href = container.querySelector('a')?.getAttribute('href') ?? '';
        expect(href).not.toContain('javascript:');
    });

    it('keeps regular http links unchanged', () => {
        const container = renderMarkdown('[site](https://example.com/page)');

        expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/page');
    });
});
