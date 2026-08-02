import { MantineProvider } from '@mantine/core';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClozeToggle from './ClozeToggle';

window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
}));

describe('ClozeToggle', () => {
    it('still swaps the hint and answer without changing the ordinal', () => {
        const span = document.createElement('span');
        span.dataset.ordinal = '2';
        span.dataset.cloze = encodeURIComponent('answer');
        span.innerHTML = '[hint]';
        const { getByRole } = render(
            <MantineProvider>
                <ClozeToggle spanElement={span} label="Cloze 2" text="answer[hint]" />
            </MantineProvider>,
        );

        fireEvent.click(getByRole('switch', { name: 'Cloze 2' }));

        expect(span.innerHTML).toBe('answer');
        expect(decodeURIComponent(span.dataset.cloze)).toBe('[hint]');
        expect(span.dataset.ordinal).toBe('2');
    });
});
