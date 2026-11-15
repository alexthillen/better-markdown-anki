import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('viewerjs', () => ({ default: class Viewer { update() {} destroy() {} } }));
window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('copy control in review header', () => {
    it('copies the available front before the answer is shown', async () => {
        document.body.innerHTML = '<div id="front-card-basic">Question only</div><div id="difficulty-card">3/10</div><div id="tags-card">Example</div>';
        document.getElementById('difficulty-card').innerText = '3/10';
        document.getElementById('tags-card').innerText = 'Example';
        let copied = '';
        document.execCommand = vi.fn(() => { copied = document.querySelector('textarea').value; return true; });
        const view = render(<MantineProvider><App /></MantineProvider>);
        const button = await view.findByRole('button', { name: 'Copy for LLM chat' });
        expect(button.parentElement.parentElement.textContent).toContain('3/10');
        fireEvent.click(button);
        await waitFor(() => expect(view.getByRole('status').textContent).toBe('Copied'));
        expect(copied).toContain('# Front\n\nQuestion only');
        expect(copied).toContain('# Back\n\n\n\n# Extra');
    });
});
