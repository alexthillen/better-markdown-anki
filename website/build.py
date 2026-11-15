"""Assemble a self-contained static website from the guide and add-on bundle."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
ADDON_DIST = ROOT.parent / 'better-markdown-anki' / 'dist'
OUTPUT = ROOT / 'dist'
FILES = ('index.html', 'styles.css', 'script.js', 'snapdeck-logo.svg', 'mountain.svg', '_walkthrough.html')


def main():
    if not (ADDON_DIST / '_better_markdown_anki.js').is_file():
        raise SystemExit('Build the add-on frontend first: cd frontend && npm run build')
    OUTPUT.mkdir(exist_ok=True)
    for name in FILES:
        shutil.copy2(ROOT / name, OUTPUT / name)
    shutil.copytree(ADDON_DIST, OUTPUT / 'addon', dirs_exist_ok=True)
    print('Static website built in', OUTPUT)


if __name__ == '__main__':
    main()
