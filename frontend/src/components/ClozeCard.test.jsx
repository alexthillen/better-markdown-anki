import { MantineProvider } from '@mantine/core';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClozeCard from './ClozeCard';

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

const colors = {
    front: { bg: 'gray.0', border: 'gray.3' },
    back: { bg: 'gray.0', border: 'gray.3' },
    extra: { bg: 'gray.0', border: 'gray.3' },
};

function sourceNode(id, html) {
    const node = document.createElement('div');
    node.id = id;
    node.innerHTML = html;
    document.body.appendChild(node);
    return node;
}

function renderCard(frontHtml, backHtml = 'answer') {
    const front = sourceNode('front-card-cloze', frontHtml);
    const back = sourceNode('back-card-cloze', backHtml);
    return render(
        <MantineProvider>
            <ClozeCard
                frontNode={front}
                backNode={back}
                extraNode={null}
                contentVersion={0}
                colors={colors}
            />
        </MantineProvider>,
    ).container;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ClozeCard', () => {
    it('keeps a cleaned block-math hint inside its colored cloze', async () => {
        const container = renderCard(
            '<span class="cloze" data-cloze="answer">[\n$$x = ...$$\n]</span>',
        );

        await waitFor(() => expect(container.querySelector('.katex-display')).not.toBeNull());
        expect(container.querySelector('.katex-display.cloze')).not.toBeNull();
        expect(container.querySelector('.markdown-content')?.textContent).not.toContain('[');
        expect(container.querySelector('.markdown-content')?.textContent).not.toContain(']');
        expect(container.querySelector('.markdown-content .bma-cloze-index')?.textContent).toBe('1');
    });

    it('labels and colors a cloze inside inline code', async () => {
        const container = renderCard(
            'Call `<span class="cloze" data-cloze="answer">[logging expression]</span>`.',
        );

        await waitFor(() => expect(container.querySelector('.bma-cloze-code-index')).not.toBeNull());
        const codeCloze = container.querySelector('.markdown-content code');
        expect(codeCloze?.querySelector('.bma-cloze-index')?.textContent).toBe('1');
        expect(codeCloze?.querySelector('.bma-cloze-code-line')?.textContent).toContain('[logging expression]');
        expect(codeCloze?.textContent).not.toContain('BMA_CLOZE_INDEX');
    });

    it('colors only the affected line in a fenced code block', async () => {
        const container = renderCard(
            '```python\ndef greet():\n    <span class="cloze" data-cloze="answer">[return statement]</span>\n```',
        );

        await waitFor(() => expect(container.querySelector('.bma-cloze-code-index')).not.toBeNull());
        const highlightedLines = container.querySelectorAll('.bma-cloze-code-line');
        expect(highlightedLines).toHaveLength(1);
        expect(highlightedLines[0].textContent).toContain('[return statement]');
        expect(highlightedLines[0].querySelector('.bma-cloze-index')?.textContent).toBe('1');
    });

    it('keeps occurrence indexes distinct for repeated clozes in code', async () => {
        const container = renderCard(
            '```javascript\nconst first = <span class="cloze" data-cloze="alpha">[first value]</span>;\nconst second = <span class="cloze" data-cloze="beta">[second value]</span>;\n```',
        );

        await waitFor(() => expect(container.querySelectorAll('.bma-cloze-code-index')).toHaveLength(2));
        const codeBlock = container.querySelector('.markdown-content code');
        expect(Array.from(codeBlock.querySelectorAll('.bma-cloze-index'), badge => badge.textContent)).toEqual(['1', '2']);
        expect(codeBlock.querySelectorAll('.bma-cloze-code-line')).toHaveLength(2);
    });
});
