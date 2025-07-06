var jsLocal = '_better_markdown_anki.js';
var jsCDN = 'https://cdn.jsdelivr.net/gh/alexthillen/better-markdown-anki@{TAG}/better-markdown-anki/dist/_better_markdown_anki.js';
var cssLocal = '_better_markdown_anki.css';
var cssCDN = 'https://cdn.jsdelivr.net/gh/alexthillen/better-markdown-anki@{TAG}/better-markdown-anki/dist/_better_markdown_anki.css';
// Load CSS
function loadCSS(href, fallback) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onerror = function () {
        if (fallback) {
            var fallbackLink = document.createElement('link');
            fallbackLink.rel = 'stylesheet';
            fallbackLink.href = fallback;
            document.head.appendChild(fallbackLink);
        }
    };
    document.head.appendChild(link);
}
// Load JS as ES Module
function loadJS(src, fallback) {
    var scriptSelector = 'script[src="' + src + '"]';
    if (!document.querySelector(scriptSelector)) {
        var script = document.createElement('script');
        script.type = 'module'; // Essential for ES modules
        script.src = src;
        script.onerror = function () {
            if (fallback && !document.querySelector('script[src="' + fallback + '"]')) {
                var fallbackScript = document.createElement('script');
                fallbackScript.type = 'module';
                fallbackScript.src = fallback;
                document.head.appendChild(fallbackScript);
            }
        };
        document.head.appendChild(script);
    }
}
loadCSS(cssLocal, cssCDN);
loadJS(jsLocal, jsCDN);

