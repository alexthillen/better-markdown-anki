import os
import re
from aqt import mw
from anki.models import ModelManager
from anki.hooks import addHook
from anki.lang import _
from anki.collection import Collection
from .utils import add_folder_to_media, patch_variables_in_file
from .fenced_code import protect_editor_fields, protect_review_html


################################ CONFIGURATION #####################################################

TAG = "DEV_TAG" # Replace with actual release tag

ADDON_DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DIST_DIRECTORY = os.path.join(ADDON_DIRECTORY, "dist")
PREVIEW_DIRECTORY = os.path.join(ADDON_DIRECTORY, "preview")
ADDON_PACKAGE = mw.addonManager.addonFromModule(__name__)

# TEMPLATES
TEMPLATE_DIR = os.path.join(ADDON_DIRECTORY, "templates")
PREVIEW_SCRIPT = patch_variables_in_file(
    os.path.join(PREVIEW_DIRECTORY, "script.js"),
    dict(TAG=TAG, ADDON_PACKAGE=ADDON_PACKAGE),
)
SCRIPT_TEMPLATE = patch_variables_in_file(
    os.path.join(TEMPLATE_DIR, "script.html"),
    dict(TAG=TAG, ADDON_PACKAGE=ADDON_PACKAGE),
)
CSS_TEMPLATE = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "style.css"), dict(TAG=TAG))
LEGACY_SCRIPT = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "legacy_script.html"), dict())
MEDIA_MODULE_SCRIPT = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "media_module_script.html"), dict())
BASIC_TEMPLATE_FRONT = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "basic", "front.html"), dict()) + SCRIPT_TEMPLATE
BASIC_TEMPLATE_BACK = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "basic", "back.html"), dict()) + SCRIPT_TEMPLATE
CLOZE_TEMPLATE_FRONT = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "cloze", "front.html"), dict()) + SCRIPT_TEMPLATE
CLOZE_TEMPLATE_BACK = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "cloze", "back.html"), dict()) + SCRIPT_TEMPLATE


# CARD NAME
CARD_NAME = "Better Markdown : {type}"
TEMPLATE_NAME = "Better Markdown ({type})" 


# FIELDS
FIELDS_BASIC = ["Front", "Back", "Extra", "Difficulty"]
FIELDS_CLOZE = ["Text", "Back Extra", "Difficulty"]

####################################################################################################


# Preview
def markdownPreview(editor):
    """This function runs when the user opens the editor, creates the markdown preview area"""
    if editor.note is None:
        print("[BMA Preview] loadNote hook fired, but editor.note is None")
        return

    note_type = editor.note.note_type()["name"]
    flags = re.IGNORECASE
    should_attach_preview = bool(re.match(r".*Better Markdown.*|.*SnapDeck.*", note_type, flags))
    print(f"[BMA Preview] loadNote hook fired for note type: {note_type}")
    print(f"[BMA Preview] preview eligible: {should_attach_preview}")

    if should_attach_preview:
        print("[BMA Preview] injecting preview loader script into editor webview")
        editor.web.eval(PREVIEW_SCRIPT)
    else:
        print("[BMA Preview] note type not eligible; removing existing preview root if present")
        editor.web.eval(
            """
        var area = document.getElementById('root-react');
        if(area) area.remove();
        """
        )
addHook("loadNote", markdownPreview)


def create_note_type(name: str, card_type: str = "basic") -> bool:
    """
    Create a new note type with specified name and type.
    
    Args:
        name: Display name for the note type
        card_type: Either "basic" or "cloze"
    
    Returns:
        bool: True if successful, False if note type already exists
    """
    col = mw.col
    assert isinstance(col, Collection), "Expected col to be an instance of Collection"
    mm = col.models  # ModelManager instance
    
    # Check if note type already exists
    if mm.by_name(name):  # Updated from byName
        print(f"Note type '{name}' already exists")
        return False
    
    if card_type.lower() == "basic":
        return _create_basic_note_type(name, mm)
    elif card_type.lower() == "cloze":
        return _create_cloze_note_type(name, mm)
    else:
        raise ValueError("card_type must be 'basic' or 'cloze'")



def _create_basic_note_type(name: str, mm: ModelManager) -> bool:
    """Create a basic note type using configured fields and templates."""
    
    # Create new model
    model = mm.new(name)
    
    # Add fields using configuration
    for field_name in FIELDS_BASIC:
        field = mm.new_field(field_name)  # Updated from newField and removed _()
        mm.add_field(model, field)  # Updated from addField
    
    # Create main card template using configured template name
    template_name = TEMPLATE_NAME.format(type="Basic")
    template = mm.new_template(template_name)
    template['qfmt'] = BASIC_TEMPLATE_FRONT
    template['afmt'] = BASIC_TEMPLATE_BACK

    mm.add_template(model, template)

    # Set CSS styling
    model['css'] = CSS_TEMPLATE
    
    # Save the model
    mm.add(model)
    return True



def _create_cloze_note_type(name: str, mm: ModelManager) -> bool:
    """Create a cloze deletion note type using configured fields and templates."""
    
    # Create new cloze model
    model = mm.new(name)
    model['type'] = 1  # Set as cloze type (0 = standard, 1 = cloze)
    
    # Add fields using configuration
    for field_name in FIELDS_CLOZE:
        field = mm.new_field(field_name)
        mm.add_field(model, field)
        print(f"Added field '{field_name}' to cloze model")
    
    # Create cloze template using configured template name
    template_name = TEMPLATE_NAME.format(type="Cloze")
    template = mm.new_template(template_name)
    template['qfmt'] = CLOZE_TEMPLATE_FRONT
    template['afmt'] = CLOZE_TEMPLATE_BACK

    print(f"Adding template to model: {template}")
    
    mm.add_template(model, template)
    
    # Set CSS styling for cloze cards
    model['css'] = CSS_TEMPLATE
    
    # Save the model only after everything is configured
    mm.add(model)  # Move this to the end
    return True




def setup_custom_note_types():
    """
    Main function to set up your custom note types.
    Call this function to create both basic and cloze note types.
    """
    try:
        # Create or update custom note types using CARD_NAME format
        basic_name = CARD_NAME.format(type="Basic")
        cloze_name = CARD_NAME.format(type="Cloze")
        
        # Try to create new note types
        basic_success = create_note_type(basic_name, "basic")
        if basic_success:
            print(f"✓ {basic_name} note type created successfully")
        else:
            # If creation failed (note type exists), try to update it
            update_existing_note_type(basic_name)
        
        cloze_success = create_note_type(cloze_name, "cloze")
        if cloze_success:
            print(f"✓ {cloze_name} note type created successfully")
        else:
            # If creation failed (note type exists), try to update it
            update_existing_note_type(cloze_name)
            
        # Refresh the UI to show new note types
        mw.reset()
        
    except Exception as e:
        print(f"Error creating note types: {str(e)}")




def update_existing_note_type(note_type_name: str, update_templates: bool = False):
    """
    Update existing note types to add missing fields if needed and optionally update templates.
    Uses configuration to determine required fields.
    
    Args:
        note_type_name: Name of the note type to update
        update_templates: Flag to indicate if templates should be updated
    """ 
    col = mw.col
    assert isinstance(col, Collection), "Expected col to be an instance of Collection"
    mm = col.models
    
    model = mm.by_name(note_type_name)  # Updated from byName
    if not model:
        print(f"Note type '{note_type_name}' not found")
        return False



    # Get current field names
    current_fields = [field['name'] for field in model['flds']]
    
    # Define required fields based on note type using configuration
    if model['type'] == 1:  # Cloze type
        required_fields = FIELDS_CLOZE
    else:  # Basic type
        required_fields = FIELDS_BASIC
    
    # Add missing fields
    fields_added = False
    for field_name in required_fields:
        if field_name not in current_fields:
            field = mm.new_field(field_name)  # Updated from newField and removed _()
            mm.add_field(model, field)  # Updated from addField
            fields_added = True
            print(f"Added field '{field_name}' to note type '{note_type_name}'")
    
    # Update templates if flag is set
    if update_templates:
        if model['type'] == 1:  # Cloze
            model['tmpls'][0]['qfmt'] = CLOZE_TEMPLATE_FRONT
            model['tmpls'][0]['afmt'] = CLOZE_TEMPLATE_BACK
        else:  # Basic
            model['tmpls'][0]['qfmt'] = BASIC_TEMPLATE_FRONT
            model['tmpls'][0]['afmt'] = BASIC_TEMPLATE_BACK
        fields_added = True  # Mark as changed to save model
        print(f"Updated templates for note type '{note_type_name}'")
    
    if fields_added:
        mm.save(model)
        print(f"Updated note type '{note_type_name}' - new cards will be generated automatically")
        return True
    else:
        print(f"Note type '{note_type_name}' already has all required fields and templates")
        return False




def update_mobile_loader():
    """Replace only an exact, recognized old loader, keeping other template edits."""
    patterns = []
    for old_script in (LEGACY_SCRIPT, MEDIA_MODULE_SCRIPT):
        escaped = re.escape(old_script)
        escaped = escaped.replace(re.escape('{TAG}'), r"[^'\"\r\n]+")
        escaped = escaped.replace(re.escape('{ADDON_PACKAGE}'), r"[^/'\"\r\n]+")
        patterns.append(re.compile(escaped))
    changed = 0
    for name in (CARD_NAME.format(type='Basic'), CARD_NAME.format(type='Cloze')):
        model = mw.col.models.by_name(name)
        if not model:
            continue
        dirty = False
        for template in model['tmpls']:
            for field in ('qfmt', 'afmt'):
                for pattern in patterns:
                    updated, count = pattern.subn(lambda _: SCRIPT_TEMPLATE, template[field])
                    if count:
                        template[field] = updated
                        changed += count
                        dirty = True
        if dirty:
            mw.col.models.save(model)
    return changed


# Initialize when add-on loads
if __name__ != "__main__":
    from aqt import gui_hooks
    from .mcp_server import MCPServer
    from .codex_setup import configure_codex
    from .claude_setup import configure_claude

    _mcp_server = None
    _codex_action = None
    _mcp_action = None
    _claude_action = None
    _whats_new_action = None
    _notice_scheduled = False
    _notice_key = 'mcp_update_notice_v2_seen'

    def start_mcp_server():
        global _mcp_server
        config = mw.addonManager.getConfig(__name__) or {}
        if not config.get('mcp_enabled', True):
            return
        try:
            port = config.get('mcp_port', 19176)
            if isinstance(port, bool) or not isinstance(port, int) or not 1024 <= port <= 65535:
                raise ValueError('mcp_port must be an integer between 1024 and 65535')
            _mcp_server = MCPServer(mw, port)
            _mcp_server.start()
            print('[Better Markdown] MCP enabled on 127.0.0.1:%d' % port)
        except (OSError, ValueError) as exc:
            _mcp_server = None
            from aqt.utils import showWarning
            showWarning('Better Markdown MCP could not start: %s' % exc)

    def stop_mcp_server():
        global _mcp_server
        if _mcp_server:
            _mcp_server.stop()
            _mcp_server = None
    
    def ensure_mcp_running():
        from aqt.utils import showWarning
        if not mw.col:
            showWarning('Open an Anki profile before connecting an MCP client.')
            return False
        config = mw.addonManager.getConfig(__name__) or {}
        if not config.get('mcp_enabled', False):
            config['mcp_enabled'] = True
            mw.addonManager.writeConfig(__name__, config)
        if _mcp_server is None:
            start_mcp_server()
        if _mcp_server is None:
            return False  # start_mcp_server already showed the reason
        config = mw.addonManager.getConfig(__name__) or {}
        if config.get('mcp_port', 19176) != _mcp_server.port:
            showWarning('MCP settings changed while Anki was running. Restart Anki and try again.')
            return False
        return True

    def connect_mcp():
        from aqt.utils import showInfo
        if not ensure_mcp_running():
            return
        showInfo('Better Markdown MCP is enabled at http://127.0.0.1:%d/mcp. '
                 'For a compatible client, use Streamable HTTP with this URL. '
                 'Local programs can access your open collection while MCP is enabled.' % _mcp_server.port)

    def connect_codex():
        from pathlib import Path
        from aqt.utils import showInfo, showWarning
        if not ensure_mcp_running():
            return
        try:
            configure_codex(Path(os.environ.get('CODEX_HOME') or (Path.home() / '.codex')) / 'config.toml', _mcp_server.port)
        except (OSError, ValueError) as exc:
            showWarning('Could not configure Codex: %s' % exc)
            return
        showInfo('Codex is configured to use Better Markdown. Restart Codex and open a new chat to load the tools.')

    def connect_claude():
        from aqt.utils import showInfo, showWarning
        if not ensure_mcp_running():
            return
        port = _mcp_server.port
        def finished(future):
            try:
                future.result()
            except ValueError as exc:
                showWarning(str(exc))
            else:
                showInfo('Claude Code is configured to use Better Markdown. Start a new Claude Code session to load the tools.')
        mw.taskman.run_in_background(lambda: configure_claude(port), finished)

    def open_setup_guide():
        from aqt.utils import openLink
        openLink(mw.serverURL() + '_addons/' + ADDON_PACKAGE + '/guide/index.html#setup')

    def show_upgrade_notice(force=False):
        global _notice_scheduled
        _notice_scheduled = False
        if not mw.col:
            return
        config = mw.addonManager.getConfig(__name__) or {}
        if config.get(_notice_key) and not force:
            return
        from aqt.qt import QMessageBox
        dialog = QMessageBox(mw)
        dialog.setWindowTitle('Better Markdown Anki is even better')
        if _mcp_server is not None:
            status = 'MCP is running, so you can connect your favorite AI assistant.'
        elif config.get('mcp_enabled', True):
            status = 'MCP could not start. See the setup guide for help.'
        else:
            status = 'MCP is currently disabled. Connect an assistant to enable it.'
        dialog.setText('Better Markdown Anki now works with AI assistants.\n\n' + status)
        connect_button = dialog.addButton('Connect Codex', QMessageBox.ButtonRole.ActionRole)
        claude_button = dialog.addButton('Connect Claude', QMessageBox.ButtonRole.ActionRole)
        guide_button = dialog.addButton('Setup guide', QMessageBox.ButtonRole.ActionRole)
        dialog.addButton('Later', QMessageBox.ButtonRole.RejectRole)
        dialog.exec()
        choice = dialog.clickedButton()
        # Re-read after the dialog so unrelated changes made while it was open survive.
        config = mw.addonManager.getConfig(__name__) or {}
        config[_notice_key] = True
        mw.addonManager.writeConfig(__name__, config)
        if choice == connect_button:
            connect_codex()
        elif choice == claude_button:
            connect_claude()
        elif choice == guide_button:
            open_setup_guide()

    def maybe_show_upgrade_notice(had_existing_note_types):
        global _notice_scheduled
        config = mw.addonManager.getConfig(__name__) or {}
        if config.get(_notice_key):
            return
        if not had_existing_note_types:
            # Don't treat a later profile opening as an upgrade after a fresh install.
            config[_notice_key] = True
            mw.addonManager.writeConfig(__name__, config)
            return
        if not _notice_scheduled:
            from aqt.qt import QTimer
            _notice_scheduled = True
            QTimer.singleShot(0, show_upgrade_notice)

    def install_codex_action():
        global _codex_action, _mcp_action, _claude_action, _whats_new_action
        if _codex_action is not None:
            return
        from aqt.qt import QAction
        _codex_action = QAction('Better Anki Markdown: Connect Codex', mw)
        _codex_action.triggered.connect(connect_codex)
        mw.form.menuTools.addAction(_codex_action)
        _mcp_action = QAction('Better Anki Markdown: Enable MCP', mw)
        _mcp_action.triggered.connect(connect_mcp)
        mw.form.menuTools.addAction(_mcp_action)
        _claude_action = QAction('Better Anki Markdown: Connect Claude', mw)
        _claude_action.triggered.connect(connect_claude)
        mw.form.menuTools.addAction(_claude_action)
        _whats_new_action = QAction("Better Anki Markdown: What's new", mw)
        _whats_new_action.triggered.connect(lambda: show_upgrade_notice(force=True))
        mw.form.menuTools.addAction(_whats_new_action)

    def on_profile_loaded():
        """Called when user profile is loaded"""
        existing = any(mw.col.models.by_name(CARD_NAME.format(type=kind))
                       for kind in ('Basic', 'Cloze'))
        mw.addonManager.setWebExports(__name__, r"(dist|preview|guide)/.*\.(css|js|woff2?|ttf|html|svg)")
        setup_custom_note_types()
        update_mobile_loader()
        add_folder_to_media(DIST_DIRECTORY, overwrite=True)
        add_folder_to_media(PREVIEW_DIRECTORY, overwrite=True)
        install_codex_action()
        start_mcp_server()
        maybe_show_upgrade_notice(existing)
    
    gui_hooks.editor_will_load_note.append(protect_editor_fields)
    gui_hooks.card_will_show.append(protect_review_html)

    # Open external-protocol links (e.g. obsidian://) clicked on cards.
    # Qt WebEngine drops main-frame navigations to unknown URL schemes before
    # they reach Anki, so the frontend forwards them via the pycmd bridge and
    # they are handed to Anki's regular allow-once/always-allow dialog.
    def _bma_open_external_url(message, cmd, context):
        if isinstance(cmd, str) and cmd.startswith("bma-open-url:"):
            from aqt.qt import QUrl
            from aqt.url_schemes import open_url_if_supported_scheme

            open_url_if_supported_scheme(QUrl(cmd[len("bma-open-url:"):]))
            return (True, None)
        return message

    gui_hooks.webview_did_receive_js_message.append(_bma_open_external_url)

    # Hook into Anki's profile loading
    gui_hooks.profile_did_open.append(on_profile_loaded)
    gui_hooks.profile_will_close.append(stop_mcp_server)
