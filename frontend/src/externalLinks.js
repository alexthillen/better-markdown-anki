export function handleExternalLink(event) {
    if (!document.getElementById('bma-external-url-bridge') || typeof pycmd !== 'function') return;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    let protocol;
    try {
        protocol = new URL(href, window.location.href).protocol;
    } catch {
        return;
    }
    if (protocol !== 'obsidian:') return;
    event.preventDefault();
    pycmd(`bma-open-url:${href}`);
}
