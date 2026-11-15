import { describe, expect, it, vi } from 'vitest';
import { buildChatText } from './copyForChat';

describe('copy for chat', () => {
    it('includes the fields and local walkthrough source without fetching remote images', async () => {
        const fetchFile = vi.fn(async () => ({ ok: true, text: async () => '<button>Next</button>' }));
        const result = await buildChatText({ front: 'Why?', back: 'Answer<br>![demo](_walk.html)', extra: '<img src="photo.png" alt="chart">' }, fetchFile);
        expect(result.text).toContain('# Front\n\nWhy?');
        expect(result.text).toContain('# Back\n\nAnswer');
        expect(result.text).toContain('<button>Next</button>');
        expect(result.text).toContain('![chart](photo.png)');
        expect(fetchFile).toHaveBeenCalledOnce();
        expect(result.missing).toEqual([]);
    });
    it('stops waiting when a media request never settles', async () => {
        vi.useFakeTimers();
        try {
            const pending = buildChatText({ front: '', back: '![demo](slow.html)', extra: '' }, () => new Promise(() => {}));
            await vi.advanceTimersByTimeAsync(1500);
            const result = await pending;
            expect(result.missing).toEqual(['slow.html']);
            expect(result.text).toContain('HTML walkthrough unavailable: slow.html');
        } finally {
            vi.useRealTimers();
        }
    });
    it('reports unavailable walkthroughs', async () => {
        const result = await buildChatText({ front: '', back: '![demo](missing.html)', extra: '' }, async () => ({ ok: false, status: 404 }));
        expect(result.missing).toEqual(['missing.html']);
        expect(result.text).toContain('[HTML walkthrough unavailable: missing.html]');
    });
});
