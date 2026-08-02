import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import './index.css';
import App from './App';
import decks from './fixtures/deck-fixtures.json';
import { clozeCodeDeck, clozeIdDeck, mediaDeck } from './mediaDeck';

const previewDecks = [...decks, mediaDeck, clozeIdDeck, clozeCodeDeck];

function clozeHtml(text, ordinal, side) {
    return text.replace(/{{c(\d+)::([\s\S]*?)}}/g, (_match, number, body) => {
        const separator = body.indexOf('::');
        const answer = separator === -1 ? body : body.slice(0, separator);
        const hint = separator === -1 ? '' : body.slice(separator + 2);
        const active = Number(number) === ordinal + 1;
        if (!active) {
            return `<span class="cloze-inactive" data-ordinal="${number}">${answer}</span>`;
        }
        if (side === 'back') {
            return `<span class="cloze" data-ordinal="${number}">${answer}</span>`;
        }
        const placeholder = hint ? `[${hint}]` : '[...]';
        return `<span class="cloze" data-cloze="${encodeURIComponent(answer)}" data-ordinal="${number}">${placeholder}</span>`;
    });
}

function sourceNode(id, content) {
    const node = document.createElement('div');
    node.id = id;
    node.innerHTML = content;
    node.hidden = true;
    document.body.appendChild(node);
}

function navigation(decks, deckIndex, noteIndex, cardIndex) {
    const nav = document.createElement('nav');
    nav.style.cssText = 'font: 14px system-ui; padding: 12px; display: flex; gap: 12px; flex-wrap: wrap';
    const deck = decks[deckIndex];
    const note = deck.notes[noteIndex];
    const links = [
        ['Previous', Math.max(0, noteIndex - 1)],
        ['Next', Math.min(deck.notes.length - 1, noteIndex + 1)],
    ];
    nav.append(`${deck.file} · ${note.model} · note ${noteIndex + 1}/${deck.notes.length} · card ${cardIndex + 1}/${note.cards.length}`);
    for (const [label, target] of links) {
        const link = document.createElement('a');
        link.href = `?deck=${deckIndex}&note=${target}&card=0`;
        link.textContent = label;
        nav.appendChild(link);
    }
    const switchDeck = document.createElement('a');
    switchDeck.href = `?deck=${(deckIndex + 1) % decks.length}&note=0&card=0`;
    switchDeck.textContent = 'Switch deck';
    nav.appendChild(switchDeck);
    if (note.cards.length > 1) {
        const switchCard = document.createElement('a');
        switchCard.href = `?deck=${deckIndex}&note=${noteIndex}&card=${cardIndex === 0 ? 1 : 0}`;
        switchCard.textContent = 'Switch cloze';
        nav.appendChild(switchCard);
    }
    document.body.appendChild(nav);
}

async function main() {
    const params = new URLSearchParams(location.search);
    const deckIndex = Math.min(Number(params.get('deck') || 0), previewDecks.length - 1);
    const deck = previewDecks[deckIndex];
    const noteIndex = Math.min(Number(params.get('note') || 0), deck.notes.length - 1);
    const note = deck.notes[noteIndex];
    const cardIndex = Math.min(Number(params.get('card') || 0), note.cards.length - 1);
    const ordinal = note.cards[cardIndex].ordinal;

    navigation(previewDecks, deckIndex, noteIndex, cardIndex);
    if (note.type === 'basic') {
        sourceNode('front-card-basic', note.fields.Front || '');
        sourceNode('back-card-basic', note.fields.Back || '');
        sourceNode('extra-card-basic', note.fields.Extra || '');
    } else {
        sourceNode('front-card-cloze', clozeHtml(note.fields.Text || '', ordinal, 'front'));
        sourceNode('back-card-cloze', clozeHtml(note.fields.Text || '', ordinal, 'back'));
        sourceNode('extra-card-cloze', note.fields['Back Extra'] || '');
    }
    sourceNode('tags-card', note.tags.join(' '));
    sourceNode('difficulty-card', note.fields.Difficulty || '');

    const root = document.createElement('div');
    root.id = 'root-react';
    document.body.appendChild(root);
    createRoot(root).render(
        <StrictMode>
            <MantineProvider defaultColorScheme="light">
                <App />
            </MantineProvider>
        </StrictMode>,
    );
}

main();
