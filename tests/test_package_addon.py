import importlib.util
import json
import tempfile
import unittest
import zipfile
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location('package_addon', Path(__file__).parents[1] / 'scripts' / 'package_addon.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)

class PackageTest(unittest.TestCase):
    def test_release_archive_has_public_code_and_clean_default_config(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'release.ankiaddon'
            package.package(output, 'v1.2.3')
            with zipfile.ZipFile(output) as archive:
                names = archive.namelist()
                for expected in ('__init__.py', 'mcp_server.py', 'markdown_validation.py', 'codex_setup.py', 'claude_setup.py', 'card_guidance.py', 'config.json', 'manifest.json', 'dist/_better_markdown_anki.js', 'guide/index.html', 'guide/script.js'):
                    self.assertIn(expected, names)
                self.assertFalse(any('__pycache__' in name or name.endswith('.pyc') for name in names))
                self.assertEqual(json.loads(archive.read('manifest.json'))['version'], '1.2.3')
                config = json.loads(archive.read('config.json'))
                self.assertTrue(config['mcp_enabled'])
                self.assertIn(b'TAG = "v1.2.3"', archive.read('__init__.py'))
                guide = archive.read('card_guidance.py').decode().lower()
                self.assertIn('do not assume a deck structure', guide)
    def test_invalid_tag_is_rejected(self):
        with self.assertRaises(ValueError): package.package('/tmp/nope.ankiaddon', '../unsafe')

    def test_unrelated_assets_are_not_packaged(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            addon = root / 'addon'
            (addon / 'dist').mkdir(parents=True)
            (addon / 'preview').mkdir()
            (addon / '__init__.py').write_text('TAG = "DEV_TAG"')
            (addon / 'dist' / '_better_markdown_anki.js').write_text('public')
            (addon / 'dist' / 'notes.txt').write_text('private')
            (addon / 'preview' / 'notes.html').write_text('private')
            (addon / 'preview' / 'script.js').write_text('public')
            output = root / 'release.ankiaddon'
            with patch.object(package, 'ADDON', addon):
                package.package(output, 'v1')
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), {
                    '__init__.py', 'dist/_better_markdown_anki.js', 'preview/script.js',
                    *('guide/' + name for name in package.GUIDE_FILES)})

if __name__ == '__main__': unittest.main()
