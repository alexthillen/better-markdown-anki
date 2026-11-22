from aqt import mw
from anki.collection import Collection

import os
from typing import Dict, Optional


def patch_variables_in_file(file_path: str, variables: dict, 
                           output_path: Optional[str] = None) -> str:
    """
    Replace all {VAR} placeholders in a file with their corresponding values.
    
    Args:
        file_path: Path to the input file
        variables: Dictionary mapping variable names to their values
        output_path: Optional path to save the patched content
    
    Returns:
        The patched content as a string
    """
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace all {VAR} patterns with corresponding values
    patched_content = patch_variables_in_text(content, variables)
    
    # Save to output file if specified
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as output_file:
            output_file.write(patched_content)
        print(f"Patched content saved to '{output_path}'")
    
    return patched_content

def patch_variables_in_text(text: str, variables: Dict[str, str]) -> str:
    """
    Replace all {VAR} placeholders in text with their corresponding values.
    
    Args:
        text: Input text containing {VAR} placeholders
        variables: Dictionary mapping variable names to their values
    
    Returns:
        Text with all placeholders replaced
    """
    for var_name, value in variables.items():
        text = text.replace(f"{{{var_name}}}", value)
    return text


def _add_file_to_media(path, overwrite: bool = False):
    filename = os.path.basename(path)
    assert isinstance(mw.col, Collection), "Expected mw.col to be an instance of Collection"
    
    media_file_path = os.path.join(mw.col.media.dir(), filename)
    
    if not os.path.isfile(media_file_path):
        mw.col.media.add_file(path)
    elif overwrite:
        os.remove(media_file_path) 
        mw.col.media.add_file(path) 

def add_folder_to_media(folder_path: str, overwrite: bool = False):
    """
    Add all files in a folder to Anki's media collection.
    
    Args:
        folder_path: Path to the folder containing files to add
        overwrite: Whether to overwrite existing files
    """
    if not os.path.isdir(folder_path):
        raise ValueError(f"'{folder_path}' is not a valid directory")
    
    for root, _, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            _add_file_to_media(file_path, overwrite=overwrite)


def ensure_user_stylesheet(media_dir: str):
    """Provide the optional stylesheet without replacing user customizations."""
    path = os.path.join(media_dir, '_better_markdown_anki_user_style.css')
    try:
        with open(path, 'x', encoding='utf-8') as stylesheet:
            stylesheet.write('/* Add custom Better Markdown styles here. */\n')
    except FileExistsError:
        pass
