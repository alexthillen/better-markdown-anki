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
    def test_tools_actions_use_consistent_names(self):
        addon, mw = load_addon()
        qt = types.ModuleType('aqt.qt')
        qt.QAction = Mock(side_effect=lambda *args: Mock())
        sys.modules['aqt.qt'] = qt
        addon.install_codex_action()
        labels = [call.args[0] for call in qt.QAction.call_args_list]
        self.assertEqual(labels, [
            'Better Anki Markdown: Connect Codex',
            'Better Anki Markdown: Enable MCP',
            'Better Anki Markdown: Connect Claude',
            "Better Anki Markdown: What's new",
        ])

    def test_revised_notice_schedules_when_previous_notice_was_seen(self):
        addon, mw = load_addon()
        mw.addonManager.getConfig.return_value = {'mcp_update_notice_seen': True}
        qt = types.ModuleType('aqt.qt')
        qt.QTimer = Mock()
        sys.modules['aqt.qt'] = qt
        addon.maybe_show_upgrade_notice(True)
        qt.QTimer.singleShot.assert_called_once()

    def test_notice_can_be_opened_from_menu_after_it_was_seen(self):
        addon, mw = load_addon()
        mw.addonManager.getConfig.return_value = {'mcp_update_notice_v2_seen': True}
        qt = types.ModuleType('aqt.qt')
        qt.QMessageBox = Mock()
        qt.QMessageBox.ButtonRole.ActionRole = 1
        qt.QMessageBox.ButtonRole.RejectRole = 2
        sys.modules['aqt.qt'] = qt
        dialog = qt.QMessageBox.return_value
        dialog.addButton.side_effect = [object(), object(), object(), object()]
        dialog.clickedButton.return_value = None
        addon.show_upgrade_notice(force=True)
        dialog.exec.assert_called_once()

    def test_upgrade_notice_is_shown_once_and_connects_only_on_request(self):
        addon, mw = load_addon()
        config = {'mcp_enabled': True}
        mw.addonManager.getConfig.return_value = config
        qt = types.ModuleType('aqt.qt')
        qt.QTimer = Mock()
        qt.QMessageBox = Mock()
        qt.QMessageBox.ButtonRole.ActionRole = 1
        qt.QMessageBox.ButtonRole.RejectRole = 2
        sys.modules['aqt.qt'] = qt
        addon.connect_codex = Mock()
        addon._mcp_server = Mock()
        addon.maybe_show_upgrade_notice(True)
        addon.maybe_show_upgrade_notice(True)
        qt.QTimer.singleShot.assert_called_once()
        dialog = qt.QMessageBox.return_value
        connect, claude, guide, later = object(), object(), object(), object()
        dialog.addButton.side_effect = [connect, claude, guide, later]
        dialog.clickedButton.return_value = connect
        qt.QTimer.singleShot.call_args.args[1]()
        self.assertTrue(config['mcp_update_notice_v2_seen'])
        self.assertIn('MCP is running', dialog.setText.call_args.args[0])
        addon.connect_codex.assert_called_once()
        addon.maybe_show_upgrade_notice(True)
        qt.QTimer.singleShot.assert_called_once()

    def test_fresh_install_skips_upgrade_notice(self):
        addon, mw = load_addon()
        config = {'mcp_enabled': False}
        mw.addonManager.getConfig.return_value = config
        addon.maybe_show_upgrade_notice(False)
        self.assertTrue(config['mcp_update_notice_v2_seen'])
        mw.addonManager.writeConfig.assert_called_once_with(addon.__name__, config)

    def test_notice_explains_disabled_server(self):
        addon, mw = load_addon()
        config = {'mcp_enabled': False}
        mw.addonManager.getConfig.return_value = config
        qt = types.ModuleType('aqt.qt')
        qt.QMessageBox = Mock()
        qt.QMessageBox.ButtonRole.ActionRole = 1
        qt.QMessageBox.ButtonRole.RejectRole = 2
        sys.modules['aqt.qt'] = qt
        dialog = qt.QMessageBox.return_value
        dialog.addButton.side_effect = [object(), object(), object(), object()]
        dialog.clickedButton.return_value = None
        addon.connect_codex = Mock()
        addon.show_upgrade_notice()
        self.assertIn('currently disabled', dialog.setText.call_args.args[0])
        addon.connect_codex.assert_not_called()

    def test_claude_notice_button_runs_only_claude_setup(self):
        addon, mw = load_addon()
        config = {'mcp_enabled': True}
        mw.addonManager.getConfig.return_value = config
        qt = types.ModuleType('aqt.qt')
        qt.QMessageBox = Mock()
        qt.QMessageBox.ButtonRole.ActionRole = 1
        qt.QMessageBox.ButtonRole.RejectRole = 2
        sys.modules['aqt.qt'] = qt
        dialog = qt.QMessageBox.return_value
        codex, claude, guide, later = object(), object(), object(), object()
        dialog.addButton.side_effect = [codex, claude, guide, later]
        dialog.clickedButton.return_value = claude
        addon.connect_claude = Mock()
        addon.connect_codex = Mock()
        addon.show_upgrade_notice()
        addon.connect_claude.assert_called_once()
        addon.connect_codex.assert_not_called()

    def test_guide_button_opens_guide_without_configuring_clients(self):
        addon, mw = load_addon()
        mw.addonManager.getConfig.return_value = {}
        qt = types.ModuleType('aqt.qt')
        qt.QMessageBox = Mock()
        qt.QMessageBox.ButtonRole.ActionRole = 1
        qt.QMessageBox.ButtonRole.RejectRole = 2
        sys.modules['aqt.qt'] = qt
        dialog = qt.QMessageBox.return_value
        codex, claude, guide, later = object(), object(), object(), object()
        dialog.addButton.side_effect = [codex, claude, guide, later]
        dialog.clickedButton.return_value = guide
        addon.connect_codex, addon.connect_claude, addon.open_setup_guide = Mock(), Mock(), Mock()
        addon.show_upgrade_notice()
        addon.open_setup_guide.assert_called_once()
        addon.connect_codex.assert_not_called()
        addon.connect_claude.assert_not_called()

    def test_claude_action_configures_on_background_thread(self):
        addon, mw = load_addon()
        addon.ensure_mcp_running = Mock(return_value=True)
        addon._mcp_server = Mock(port=19176)
        addon.configure_claude = Mock()
        utils = types.ModuleType('aqt.utils')
        utils.showInfo, utils.showWarning = Mock(), Mock()
        sys.modules['aqt.utils'] = utils
        addon.connect_claude()
        worker, callback = mw.taskman.run_in_background.call_args.args
        worker()
        addon.configure_claude.assert_called_once_with(19176)
        callback(Mock(result=Mock(return_value=None)))
        utils.showInfo.assert_called_once()
        utils.showWarning.assert_not_called()

    def test_server_defaults_on_and_respects_explicit_disable(self):
        addon, mw = load_addon()
        mw.addonManager.getConfig.return_value = {}
        addon.MCPServer = Mock()
        addon.start_mcp_server()
        addon.MCPServer.assert_called_once_with(mw, 19176)
        addon.MCPServer.return_value.start.assert_called_once()
        addon.stop_mcp_server()
        addon.MCPServer.reset_mock()
        mw.addonManager.getConfig.return_value = {'mcp_enabled': False}
        addon.start_mcp_server()
        addon.MCPServer.assert_not_called()

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
