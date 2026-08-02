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


if __name__ == "__main__":
    unittest.main()
