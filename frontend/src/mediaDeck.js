import imageUrl from './assets/react.svg';

export const mediaDeck = {
    file: 'Synthetic media compatibility cards',
    decks: { media: 'Media compatibility' },
    notes: [
        {
            id: 'media-markdown',
            model: 'Better Markdown : Basic',
            type: 'basic',
            fields: {
                Front: `# Markdown image\n\n![React logo](${imageUrl})`,
                Back: 'The bundled image should render and open in the image viewer.',
                Extra: `Asset URL: \`${imageUrl}\``,
                Difficulty: 'Media',
            },
            tags: ['media', 'markdown-image'],
            cards: [{ id: 'media-markdown-card', deckId: 'media', ordinal: 0 }],
        },
        {
            id: 'media-html',
            model: 'Better Markdown : Basic',
            type: 'basic',
            fields: {
                Front: `# HTML image\n\n<img src="${imageUrl}" alt="React logo from HTML" width="240">`,
                Back: 'Raw HTML images should receive the same zoom affordance.',
                Extra: '',
                Difficulty: 'Media',
            },
            tags: ['media', 'html-image'],
            cards: [{ id: 'media-html-card', deckId: 'media', ordinal: 0 }],
        },
    ],
};

export const clozeIdDeck = {
    file: 'Synthetic cloze identifier cards',
    decks: { clozeIds: 'Cloze identifier compatibility' },
    notes: [
        {
            id: 'repeated-cloze-ids',
            model: 'Better Markdown : Cloze',
            type: 'cloze',
            fields: {
                Text: 'First {{c1::alpha::first hint}}, repeated {{c1::alpha again::repeat hint}}, and {{c2::beta::second hint}}.',
                'Back Extra': 'Repeated occurrences intentionally share their Anki cloze ID.',
                Difficulty: 'Cloze IDs',
            },
            tags: ['cloze-id', 'repeated-cloze'],
            cards: [
                { id: 'repeated-cloze-c1', deckId: 'clozeIds', ordinal: 0 },
                { id: 'repeated-cloze-c2', deckId: 'clozeIds', ordinal: 1 },
            ],
        },
    ],
};

export const clozeCodeDeck = {
    file: 'Synthetic clozes in code',
    decks: { clozeCode: 'Clozes in code' },
    notes: [
        {
            id: 'inline-code-cloze',
            model: 'Better Markdown : Cloze',
            type: 'cloze',
            fields: {
                Text: 'Call `{{c1::console.log("hello")::logging expression}}` to print a value.',
                'Back Extra': 'The cloze is intentionally nested inside inline code.',
                Difficulty: 'Code cloze',
            },
            tags: ['cloze', 'inline-code'],
            cards: [{ id: 'inline-code-cloze-card', deckId: 'clozeCode', ordinal: 0 }],
        },
        {
            id: 'fenced-code-cloze',
            model: 'Better Markdown : Cloze',
            type: 'cloze',
            fields: {
                Text: 'Complete the function:\n\n```python\ndef greet():\n    {{c1::return "hello"::return statement}}\n```',
                'Back Extra': 'The cloze is intentionally nested inside a fenced Python block.',
                Difficulty: 'Code cloze',
            },
            tags: ['cloze', 'fenced-code'],
            cards: [{ id: 'fenced-code-cloze-card', deckId: 'clozeCode', ordinal: 0 }],
        },
        {
            id: 'multiple-code-clozes',
            model: 'Better Markdown : Cloze',
            type: 'cloze',
            fields: {
                Text: '```javascript\nconst first = {{c1::alpha::first value}};\nconst second = {{c1::beta::second value}};\n```',
                'Back Extra': 'Both occurrences belong to the same Anki cloze card.',
                Difficulty: 'Code cloze',
            },
            tags: ['cloze', 'fenced-code', 'repeated-cloze'],
            cards: [{ id: 'multiple-code-clozes-card', deckId: 'clozeCode', ordinal: 0 }],
        },
    ],
};
