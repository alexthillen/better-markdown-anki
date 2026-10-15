import { describe, expect, it } from 'vitest';
import { clozeHtml } from './clozeHtml';

function node(html) {
    const result = document.createElement('div');
    result.innerHTML = html;
    return result;
}

describe('clozeHtml', () => {
    it('previews every deletion, including repeated numbers and HTML hints', () => {
        const text = '{{c1::one::first}} {{c1::<b>two</b>}} {{c3::three::<i>third</i>}}';
        const front = node(clozeHtml(text, null, 'front'));
        const spans = [...front.querySelectorAll('.cloze')];
        expect(spans.map(span => span.textContent)).toEqual(['[first]', '[...]', '[third]']);
        expect(spans.map(span => decodeURIComponent(span.dataset.cloze))).toEqual(['one', '<b>two</b>', 'three']);
        expect(node(clozeHtml(text, null, 'back')).textContent).toBe('one two three');
    });

    it('keeps numbered development card previews limited to their ordinal', () => {
        const front = node(clozeHtml('{{c1::one}} {{c2::two::second}}', 1, 'front'));
        expect(front.querySelector('.cloze-inactive').textContent).toBe('one');
        expect(front.querySelector('.cloze').textContent).toBe('[second]');
        expect(node(clozeHtml('{{c2::two::second}}', 1, 'back')).textContent).toBe('two');
    });

    it('balances nested clozes and keeps inner hints out of the outer answer', () => {
        const text = '{{c1::outer {{c2::inner::inside}} tail::outside}}';
        const front = node(clozeHtml(text, null, 'front'));
        const outer = front.querySelector('.cloze');
        expect(outer.textContent).toBe('[outside]');
        const revealed = node(decodeURIComponent(outer.dataset.cloze));
        expect(revealed.textContent).toBe('outer [inside] tail');
        expect(decodeURIComponent(revealed.querySelector('.cloze').dataset.cloze)).toBe('inner');
        expect(node(clozeHtml(text, null, 'back')).textContent).toBe('outer inner tail');
    });

    it.each(['before {{c1::unfinished', '{{c1::outer {{c2::inner}}', 'plain :: text }}'])('preserves incomplete or ordinary text: %s', text => {
        expect(clozeHtml(text, null, 'front')).toBe(text);
    });
});
