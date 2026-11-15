"""Assemble a self-contained static website from the guide and add-on bundle."""
from pathlib import Path
import argparse
import shutil

ROOT = Path(__file__).resolve().parent
ADDON_DIST = ROOT.parent / 'better-markdown-anki' / 'dist'
OUTPUT = ROOT / 'dist'
FILES = ('index.html', 'styles.css', 'script.js', 'snapdeck-logo.svg', 'mountain.svg', '_walkthrough.html')


def main(output=OUTPUT):
    if not (ADDON_DIST / '_better_markdown_anki.js').is_file():
        raise SystemExit('Build the add-on frontend first: cd frontend && npm run build')
    output.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        shutil.copy2(ROOT / name, output / name)
    addon = output / 'addon'
    addon.mkdir(exist_ok=True)
    for path in ADDON_DIST.iterdir():
        if (not path.is_symlink() and path.is_file()
                and path.name.startswith('_better_markdown_anki')
                and path.suffix in {'.js', '.css', '.woff', '.woff2', '.ttf'}):
            shutil.copy2(path, addon / path.name)
    print('Static website built in', output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=OUTPUT)
    main(parser.parse_args().output)
