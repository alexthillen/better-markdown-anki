import React from 'react';
import { MantineProvider } from '@mantine/core';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyForChat from './CopyForChat';

window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('CopyForChat', () => {
    it('copies using the Anki webview clipboard without waiting for the modern API', async () => {
        const copy = vi.fn(() => true);
        document.execCommand = copy;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(() => new Promise(() => {})) } });
        render(<MantineProvider><CopyForChat front="Why?" back="Because." extra="" /></MantineProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'Copy for LLM chat' }));
        await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Copied'));
        expect(copy).toHaveBeenCalledWith('copy');
        expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
    it('clears the copied status after a short delay', async () => {
        vi.useFakeTimers();
        document.execCommand = vi.fn(() => true);
        render(<MantineProvider><CopyForChat front="Why?" back="" extra="" /></MantineProvider>);
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy for LLM chat' })); });
        expect(screen.getByRole('status').textContent).toBe('Copied');
        await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
        expect(screen.getByRole('status').textContent).toBe('');
    });

});
