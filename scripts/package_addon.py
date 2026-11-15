"""Create a clean AnkiWeb-compatible archive without mutating the checkout."""
import argparse
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADDON = ROOT / 'better-markdown-anki'
PUBLIC_FILES = {'__init__.py', 'utils.py', 'fenced_code.py', 'card_guidance.py',
                'mcp_server.py', 'markdown_validation.py', 'codex_setup.py', 'manifest.json', 'config.json', 'config.md'}
PUBLIC_ASSETS = {'preview/script.js', 'templates/script.html', 'templates/legacy_script.html', 'templates/media_module_script.html', 'templates/style.css',
                 'templates/basic/front.html', 'templates/basic/back.html',
                 'templates/cloze/front.html', 'templates/cloze/back.html'}


def is_public_asset(path):
    if path.as_posix() in PUBLIC_ASSETS:
        return True
    return (len(path.parts) == 2 and path.parts[0] == 'dist'
            and path.name.startswith('_better_markdown_anki')
            and path.suffix in {'.js', '.css', '.woff', '.woff2', '.ttf'})


def package(output, tag):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', tag):
        raise ValueError('Invalid release tag')
    if not (ADDON / 'dist' / '_better_markdown_anki.js').is_file():
        raise ValueError('Build the frontend before packaging')
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(ADDON.rglob('*')):
            if path.is_symlink() or not path.is_file():
                continue
            relative_path = path.relative_to(ADDON)
            if relative_path.as_posix() not in PUBLIC_FILES and not is_public_asset(relative_path):
                continue
            relative = relative_path.as_posix()
            data = path.read_bytes()
            if relative == '__init__.py':
                marker = b'TAG = "DEV_TAG"'
                if marker not in data:
                    raise ValueError('Release tag marker is missing')
                data = data.replace(marker, ('TAG = "%s"' % tag).encode('ascii'), 1)
            elif relative == 'manifest.json':
                manifest = json.loads(data)
                manifest['version'] = tag.removeprefix('v')
                data = (json.dumps(manifest, indent=2) + '\n').encode('utf-8')
            archive.writestr(relative, data)
    print('Created', output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--tag', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    package(args.output, args.tag)
