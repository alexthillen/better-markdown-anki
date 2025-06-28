import os
from aqt import mw
from anki.models import ModelManager
from anki.lang import _
from anki.collection import Collection
from .utils import add_folder_to_media, patch_variables_in_file


################################ CONFIGURATION #####################################################


TAG = "DEV_TAG" # Replace with actual release tag

ADDON_DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DIST_DIRECTORY = os.path.join(ADDON_DIRECTORY, "dist")

# TEMPLATES
TEMPLATE_DIR = os.path.join(ADDON_DIRECTORY, "templates")
SCRIPT_TEMPLATE = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "script.html"), dict(TAG=TAG))
CSS_TEMPLATE = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "style.css"), dict(TAG=TAG))
BASIC_TEMPLATE_FRONT = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "basic", "front.html"), dict()) + SCRIPT_TEMPLATE
BASIC_TEMPLATE_BACK = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "basic", "back.html"), dict()) + SCRIPT_TEMPLATE
CLOZE_TEMPLATE_FRONT = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "cloze", "front.html"), dict()) + SCRIPT_TEMPLATE
CLOZE_TEMPLATE_BACK = patch_variables_in_file(os.path.join(TEMPLATE_DIR, "cloze", "back.html"), dict()) + SCRIPT_TEMPLATE


# CARD NAME
CARD_NAME = "Better Markdown Anki ({type})"


# FIELDS
FIELDS_BASIC = ["Front", "Back", "Extra", "Difficulty"]
FIELDS_CLOZE = ["Text", "Back Extra", "Difficulty"]



####################################################################################################


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
    
    # Create main card template using configured templates
    template = mm.new_template("Card 1")  # Updated from newTemplate and removed _()
    template['qfmt'] = BASIC_TEMPLATE_FRONT
    template['afmt'] = BASIC_TEMPLATE_BACK
    
    mm.add_template(model, template)  # Updated from addTemplate
    
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
    
    # Create cloze template using configured templates
    template = mm.new_template("Cloze")
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
            update_existing_note_type(basic_name, update_templates=True)
        
        cloze_success = create_note_type(cloze_name, "cloze")
        if cloze_success:
            print(f"✓ {cloze_name} note type created successfully")
        else:
            # If creation failed (note type exists), try to update it
            update_existing_note_type(cloze_name, update_templates=True)
            
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
        model['css'] = CSS_TEMPLATE
        fields_added = True  # Mark as changed to save model
        print(f"Updated templates for note type '{note_type_name}'")
    
    if fields_added:
        mm.save(model)
        print(f"Updated note type '{note_type_name}' - new cards will be generated automatically")
        return True
    else:
        print(f"Note type '{note_type_name}' already has all required fields and templates")
        return False



# Initialize when add-on loads
if __name__ != "__main__":
    from aqt import gui_hooks
    
    def on_profile_loaded():
        """Called when user profile is loaded"""
        setup_custom_note_types()
        add_folder_to_media(DIST_DIRECTORY)
    
    # Hook into Anki's profile loading
    gui_hooks.profile_did_open.append(on_profile_loaded)

    