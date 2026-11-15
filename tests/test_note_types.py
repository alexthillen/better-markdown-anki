import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock


def load_addon():
    root = Path(__file__).parents[1] / "better-markdown-anki"
    mw = Mock()
    mw.addonManager.addonFromModule.return_value = "addon-id"

    aqt = types.ModuleType("aqt")
    aqt.mw = mw
    aqt.gui_hooks = Mock()
    aqt.gui_hooks.profile_did_open = []
    sys.modules["aqt"] = aqt

    hooks = types.ModuleType("anki.hooks")
    hooks.addHook = Mock()
    sys.modules["anki.hooks"] = hooks

    models = types.ModuleType("anki.models")
    models.ModelManager = object
    sys.modules["anki.models"] = models

    lang = types.ModuleType("anki.lang")
    lang._ = lambda value: value
    sys.modules["anki.lang"] = lang

    collection = types.ModuleType("anki.collection")
    collection.Collection = object
    sys.modules["anki.collection"] = collection

    package = types.ModuleType("better_markdown_anki")
    package.__path__ = [str(root)]
    sys.modules["better_markdown_anki"] = package

    spec = importlib.util.spec_from_file_location(
        "better_markdown_anki.addon", root / "__init__.py"
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module, mw


class NoteTypeUpdatesTest(unittest.TestCase):
    def test_mobile_loader_upgrade_preserves_other_customizations(self):
        addon, mw = load_addon()
        old = addon.LEGACY_SCRIPT.replace('{TAG}', 'v1.2.3').replace('{ADDON_PACKAGE}', '2100166052')
        model = {'tmpls': [{'qfmt': 'custom front\n' + old, 'afmt': 'custom back\n' + old}], 'css': 'custom css'}
        mw.col.models.by_name.side_effect = lambda name: model if name.endswith('Basic') else None
        self.assertEqual(addon.update_mobile_loader(), 2)
        self.assertEqual(model['tmpls'][0]['qfmt'], 'custom front\n' + addon.SCRIPT_TEMPLATE)
        self.assertEqual(model['tmpls'][0]['afmt'], 'custom back\n' + addon.SCRIPT_TEMPLATE)
        self.assertEqual(model['css'], 'custom css')
        self.assertEqual(addon.update_mobile_loader(), 0)
        mw.col.models.save.assert_called_once_with(model)

    def test_mobile_loader_updates_previous_media_version_but_skips_edited_loader(self):
        addon, mw = load_addon()
        old = addon.MEDIA_MODULE_SCRIPT.replace('{TAG}', 'v1.2.3').replace('{ADDON_PACKAGE}', '2100166052')
        edited = old.replace('function loadCSS', 'function myCustomLoader')
        model = {'tmpls': [{'qfmt': 'front\n' + old, 'afmt': 'back\n' + edited}], 'css': 'custom css'}
        mw.col.models.by_name.side_effect = lambda name: model if name.endswith('Basic') else None
        self.assertEqual(addon.update_mobile_loader(), 1)
        self.assertEqual(model['tmpls'][0]['qfmt'], 'front\n' + addon.SCRIPT_TEMPLATE)
        self.assertEqual(model['tmpls'][0]['afmt'], 'back\n' + edited)

    def test_profile_setup_preserves_existing_templates(self):
        addon, mw = load_addon()
        mw.col = Mock()
        models = {}
        for kind, fields, model_type in [('Basic', addon.FIELDS_BASIC, 0), ('Cloze', addon.FIELDS_CLOZE, 1)]:
            models[f'Better Markdown : {kind}'] = {
                'type': model_type, 'flds': [{'name': name} for name in fields],
                'tmpls': [{'qfmt': f'{kind} custom front', 'afmt': f'{kind} custom back'}],
                'css': 'custom css',
            }
        mw.col.models.by_name.side_effect = models.get
        addon.setup_custom_note_types()
        for kind in ('Basic', 'Cloze'):
            model = models[f'Better Markdown : {kind}']
            self.assertEqual(model['tmpls'][0], {'qfmt': f'{kind} custom front', 'afmt': f'{kind} custom back'})
            self.assertEqual(model['css'], 'custom css')
        mw.col.models.save.assert_not_called()

    def test_template_updates_preserve_custom_css(self):
        addon, mw = load_addon()
        model = {
            "type": 0,
            "flds": [{"name": name} for name in addon.FIELDS_BASIC],
            "tmpls": [{"qfmt": "old front", "afmt": "old back"}],
            "css": ".card { color: rebeccapurple; }",
        }
        mw.col = Mock()
        mw.col.models.by_name.return_value = model

        addon.update_existing_note_type("Better Markdown : Basic", update_templates=True)

        self.assertEqual(model["css"], ".card { color: rebeccapurple; }")
        self.assertEqual(model["tmpls"][0]["qfmt"], addon.BASIC_TEMPLATE_FRONT)
        mw.col.models.save.assert_called_once_with(model)


class CodexConnectionActionTest(unittest.TestCase):
    def test_general_connection_enables_server_without_configuring_codex(self):
        addon, mw = load_addon()
        mw.col = Mock()
        config = {'mcp_enabled': False, 'mcp_port': 19176}
        mw.addonManager.getConfig.return_value = config
        server = Mock()
        def make_server(_mw, port):
            server.port = port
            return server
        addon.MCPServer = Mock(side_effect=make_server)
        addon.configure_codex = Mock()
        utils = types.ModuleType('aqt.utils')
        utils.showInfo, utils.showWarning = Mock(), Mock()
        sys.modules['aqt.utils'] = utils
        addon.connect_mcp()
        self.assertTrue(config['mcp_enabled'])
        server.start.assert_called_once()
        addon.configure_codex.assert_not_called()
        self.assertIn('127.0.0.1:19176/mcp', utils.showInfo.call_args.args[0])
        utils.showWarning.assert_not_called()

    def test_connect_enables_server_and_configures_codex(self):
        addon, mw = load_addon()
        mw.col = Mock()
        config = {'mcp_enabled': False, 'mcp_port': 19176}
        mw.addonManager.getConfig.return_value = config
        server = Mock()
        def make_server(_mw, port):
            server.port = port
            return server
        addon.MCPServer = Mock(side_effect=make_server)
        addon.configure_codex = Mock()
        utils = types.ModuleType('aqt.utils')
        utils.showInfo = Mock()
        utils.showWarning = Mock()
        sys.modules['aqt.utils'] = utils
        addon.connect_codex()
        self.assertTrue(config['mcp_enabled'])
        server.start.assert_called_once()
        addon.configure_codex.assert_called_once()
        self.assertEqual(addon.configure_codex.call_args.args[1], 19176)
        utils.showInfo.assert_called_once()
        utils.showWarning.assert_not_called()



if __name__ == "__main__":
    unittest.main()
