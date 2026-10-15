import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/index.css', 'utf8');

vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: vi.fn() }) }));
vi.mock('./App.jsx', () => ({ default: () => null }));
vi.mock('./Preview.jsx', () => ({ default: () => null }));

afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.body.className = '';
    vi.resetModules();
});

describe('review spacing', () => {
    it('keeps the review height workaround and mounts the rendered card after it', async () => {
        document.body.innerHTML = '<main><div id="front-card-basic">question</div></main>';
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        await import('./main.jsx');

        expect(document.body.classList.contains('bma-review')).toBe(true);
        expect(getComputedStyle(document.querySelector('main')).maxHeight).toBe('10vh');
        expect(document.querySelector('main').nextElementSibling.id).toBe('root-react');
    });

    it('leaves editor height unconstrained and clears an old review marker', async () => {
        document.body.classList.add('bma-review');
        document.body.innerHTML = '<main><div id="fields">editor fields</div></main>';
        const style = document.createElement('style');
        style.textContent = 'main { min-height: 200px; max-height: none; }' + css;
        document.head.appendChild(style);

        await import('./main.jsx');

        const layout = getComputedStyle(document.querySelector('main'));
        expect(layout.minHeight).toBe('200px');
        expect(layout.maxHeight).toBe('none');
        expect(document.getElementById('fields').nextElementSibling.id).toBe('root-react');
    });
});
