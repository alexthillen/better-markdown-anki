import { MantineProvider } from '@mantine/core';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Preview from './Preview';

vi.mock('viewerjs', () => ({ default: class Viewer { update() {} destroy() {} } }));
window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
}));

function editorFields(fields, shadow = true) {
    const container = document.createElement('div');
    container.id = 'fields';
    for (const [name, html] of Object.entries(fields)) {
        const field = document.createElement('div');
        const label = document.createElement('span');
        label.className = 'label-name';
        // jsdom does not implement the browser's innerText getter.
        label.innerText = name;
        const host = document.createElement('div');
        host.className = 'rich-text-editable';
        const editable = document.createElement('anki-editable');
        editable.innerHTML = html;
        (shadow ? host.attachShadow({ mode: 'open' }) : host).appendChild(editable);
        field.append(label, host);
        container.appendChild(field);
    }
    return container;
}

function mountEditor(fields, shadow = true) {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const editor = document.createElement('div');
    editor.className = 'note-editor';
    const source = editorFields(fields, shadow);
    const root = document.createElement('div');
    root.id = 'root-react';
    editor.append(source, root);
    document.body.appendChild(editor);
    const view = render(<MantineProvider><Preview /></MantineProvider>, { container: root });
    return { ...view, source };
}

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('editor cloze preview', () => {
    it('renders front/back/extra and toggles repeated clozes without changing the field', async () => {
        const text = '{{c1::alpha::first}} and {{c1::beta}}';
        const view = mountEditor({ Text: text, 'Back Extra': 'Explanation' });
        await waitFor(() => expect(view.getAllByRole('switch')).toHaveLength(2));
        expect(view.getByText('FRONT')).toBeTruthy();
        expect(view.getByText('BACK')).toBeTruthy();
        expect(view.getByText('EXTRA')).toBeTruthy();
        const content = () => [...view.container.querySelectorAll('.markdown-content')].map(node => node.textContent);
        expect(content()[0]).toContain('[first]');
        expect(content()[1]).toContain('alpha and beta');
        expect(content()[2]).toContain('Explanation');

        fireEvent.click(view.getAllByRole('switch')[0]);
        expect(content()[0]).toContain('alpha');
        expect(content()[0]).toContain('[...]');
        fireEvent.click(view.getAllByRole('switch')[1]);
        expect(content()[0]).toContain('beta');
        fireEvent.keyUp(view.getAllByRole('switch')[1], { key: ' ' });
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 600)); });
        expect(view.getAllByRole('switch')[1].checked).toBe(true);
        fireEvent.click(view.getAllByRole('switch')[0]);
        expect(content()[0]).toContain('[first]');
        expect(content()[0]).toContain('beta');
        expect(view.source.querySelector('.rich-text-editable').shadowRoot.querySelector('anki-editable').innerHTML).toBe(text);
    });

    it('refreshes shadow DOM edits and resets toggles when switching to an identical note', async () => {
        const view = mountEditor({ Text: '{{c1::alpha}}' });
        await waitFor(() => expect(view.getAllByRole('switch')).toHaveLength(1));
        fireEvent.click(view.getByRole('switch'));
        expect(view.getByRole('switch').checked).toBe(true);

        const replacement = editorFields({ Text: '{{c1::alpha}}' });
        view.source.replaceWith(replacement);
        await waitFor(() => expect(view.getByRole('switch').checked).toBe(false));
        const editable = replacement.querySelector('.rich-text-editable').shadowRoot.querySelector('anki-editable');
        editable.innerHTML = '{{c1::changed::new hint}}';
        fireEvent.keyUp(window, { key: '}' });
        await waitFor(() => expect(view.container.querySelector('.markdown-content').textContent).toContain('[new hint]'));
        expect(view.container.querySelectorAll('.markdown-content')[1].textContent).toContain('changed');
    });

    it('supports nested toggles and still switches back to Basic fields', async () => {
        const view = mountEditor({ Text: '{{c1::outer {{c2::inner::inside}} tail::outside}}' }, false);
        await waitFor(() => expect(view.getAllByRole('switch')).toHaveLength(1));
        fireEvent.click(view.getByRole('switch'));
        expect(view.getAllByRole('switch')).toHaveLength(2);
        fireEvent.click(view.getAllByRole('switch')[1]);
        expect(view.container.querySelector('.markdown-content').textContent).toContain('inner');
        expect(view.getAllByRole('switch')[0].checked).toBe(true);
        fireEvent.click(view.getAllByRole('switch')[0]);
        expect(view.getAllByRole('switch')).toHaveLength(1);
        expect(view.container.querySelector('.markdown-content').textContent).toContain('[outside]');

        view.source.replaceWith(editorFields({ Front: 'Basic question', Back: 'Basic answer', Extra: '' }, false));
        await waitFor(() => expect(view.getByText('Basic question')).toBeTruthy());
        expect(view.queryAllByRole('switch')).toHaveLength(0);
        expect(view.getByText('Basic answer')).toBeTruthy();
    });
});
