const examples = [
  { label: 'Basic question', description: 'A focused question and a concise answer make an easy starting point.', source: 'Front\nWhy does a bicycle stay upright while moving?\n\nBack\nSteering helps keep its contact points beneath it.', front: 'Why does a bicycle stay upright while moving?', back: 'Steering helps keep its contact points beneath it.' },
  { label: 'Bold & emphasis', description: 'Use emphasis to make the part you need to remember easy to find.', source: 'A **primary key** uniquely identifies a row.\n\nIt must be *unique* and non-null.' },
  { label: 'Lists', description: 'Break a sequence into small, scannable steps.', source: '### Make a cup of tea\n\n1. Heat the water.\n2. Steep the leaves.\n3. Remove and serve.' },
  { label: 'Tables', description: 'Compare related concepts side by side with a Markdown table.', source: '| Shape | Sides |\n| :--- | ---: |\n| Triangle | 3 |\n| Square | 4 |' },
  { label: 'Inline math', description: 'Place a short equation inside a sentence using single dollar signs.', source: 'For a circle of radius $r$, the circumference is $C = 2\\pi r$.' },
  { label: 'Display math', description: 'Give a longer expression room to breathe on its own line.', source: 'The mean of $n$ values is:\n\n$$\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i$$' },
  { label: 'Code blocks', description: 'Name the language after a code fence for syntax highlighting.', source: '```python\ndef is_even(n):\n    return n % 2 == 0\n```' },
  { label: 'Cloze deletion', description: 'Hide a specific phrase. Anki turns each numbered deletion into a card.', source: 'A triangle has {{c1::three::number of}} sides.', cloze: true },
  { label: 'Images', description: 'Reference media in your Anki collection with ordinary Markdown image syntax.', source: '![A simple mountain diagram](mountain.svg)\n\nThe peak is the highest point.' },
  { label: 'HTML walkthrough', description: 'Embed a trusted, self-contained HTML file from collection.media as a sandboxed walkthrough.', source: '![Interactive walkthrough](_walkthrough.html)' },
];

const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function cardDocument(item) {
  const base = new URL('.', document.baseURI).href;
  const addon = new URL('addon/', base).href;
  const front = item.cloze
    ? 'A triangle has <span class="cloze" data-cloze="three" data-ordinal="1">[number of]</span> sides.'
    : escapeHtml(item.front || item.source);
  const back = item.back ? `<div id="back-card-basic">${escapeHtml(item.back)}</div>` : '';
  const field = item.cloze ? 'front-card-cloze' : 'front-card-basic';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapeHtml(base)}"><link rel="stylesheet" href="${escapeHtml(addon)}_better_markdown_anki.css"><style>body{margin:0;background:#1a1b1e;color:#c1c2c5}#root-react{margin:0!important}</style></head><body class="card nightMode"><div id="${field}">${front}</div>${back}<div id="tags-card"></div><div id="difficulty-card"></div><script type="module" src="${escapeHtml(addon)}_better_markdown_anki.js"><\/script></body></html>`;
}

// The preview uses the real add-on, so size the iframe to its rendered card
// instead of forcing visitors to scroll inside a small fixed-height window.
function fitPreview(frame) {
  let cleanup = () => {};
  frame.addEventListener('load', () => {
    cleanup();
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    let resizeObserver;
    let root;
    const update = () => {
      if (!root) return;
      const height = Math.max(180, Math.ceil(root.getBoundingClientRect().height + 2));
      if (frame.style.height !== `${height}px`) frame.style.height = `${height}px`;
    };
    const attach = () => {
      const candidate = doc.getElementById('root-react');
      if (!candidate || candidate === root) return;
      resizeObserver?.disconnect();
      root = candidate;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(root);
      }
      update();
    };
    const observer = new MutationObserver(() => { attach(); update(); });
    observer.observe(doc.body, { childList: true, subtree: true });
    attach();
    cleanup = () => { observer.disconnect(); resizeObserver?.disconnect(); };
  });
}
fitPreview(document.querySelector('#hero-card'));
fitPreview(document.querySelector('#example-result'));

const list = document.querySelector('#example-list');
const number = document.querySelector('#example-number');
const title = document.querySelector('#example-title');
const description = document.querySelector('#example-description');
const source = document.querySelector('#example-source');
const result = document.querySelector('#example-result');
let active = 0;

function renderExample(index, focus = false) {
  active = (index + examples.length) % examples.length;
  const item = examples[active];
  document.querySelector('#example-panel').setAttribute('aria-labelledby', `example-tab-${active}`);
  number.textContent = `${String(active + 1).padStart(2, '0')} / ${examples.length}`;
  title.textContent = item.label;
  description.textContent = item.description;
  source.textContent = item.source;
  result.srcdoc = cardDocument(item);
  list.querySelectorAll('button').forEach((button, i) => {
    button.classList.toggle('selected', i === active);
    button.setAttribute('aria-selected', String(i === active));
    button.tabIndex = i === active ? 0 : -1;
    if (i === active && focus) button.focus();
  });
}
examples.forEach((item, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.role = 'tab';
  button.id = `example-tab-${index}`;
  button.setAttribute('aria-controls', 'example-panel');
  button.innerHTML = `<span class="list-number">${String(index + 1).padStart(2, '0')}</span><span>${item.label}</span><span class="list-arrow">↗</span>`;
  button.addEventListener('click', () => renderExample(index));
  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); renderExample(active + 1, true); }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); renderExample(active - 1, true); }
  });
  list.append(button);
});
document.querySelector('#prev-example').addEventListener('click', () => renderExample(active - 1));
document.querySelector('#next-example').addEventListener('click', () => renderExample(active + 1));
renderExample(0);
document.querySelector('#hero-card').srcdoc = cardDocument({ front: 'Why does binary search halve its search space?', back: '**Sorted order rules out half the candidates** with each comparison.\n\nTime complexity: $O(\\log n)$.' });

document.querySelectorAll('.copy-button').forEach(button => {
  button.addEventListener('click', async () => {
    const text = button.dataset.copy || document.getElementById(button.dataset.copyTarget)?.textContent;
    if (!text) return;
    const previous = button.innerHTML;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy unavailable';
    }
    window.setTimeout(() => { button.innerHTML = previous; }, 2200);
  });
});
