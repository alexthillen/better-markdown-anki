import { describe, expect, it } from 'vitest';
import { hasExternalMutation } from './previewMutations';

describe('hasExternalMutation', () => {
    it('ignores mutations caused by rendering the preview', () => {
        const previewRoot = document.createElement('div');
        const katexNode = document.createElement('span');
        previewRoot.appendChild(katexNode);

        expect(hasExternalMutation([{ target: katexNode }], previewRoot)).toBe(false);
    });

    it('keeps reacting to editor field mutations', () => {
        const previewRoot = document.createElement('div');
        const field = document.createElement('anki-editable');

        expect(hasExternalMutation([{ target: field }], previewRoot)).toBe(true);
    });
});
