import os
import shutil

def main():
    # Determine source and destination paths
    repo_root = os.path.dirname(os.path.abspath(__file__))
    dist_assets_dir = os.path.join(repo_root, "frontend", "dist")

    dest_dir = os.path.expanduser("~/.local/share/Anki2/User 1/collection.media/better-markdown-anki/dist")
    os.makedirs(dest_dir, exist_ok=True)
    # Copy the dist directory to the destination
    if os.path.exists(dest_dir):
        shutil.rmtree(dest_dir)
    shutil.copytree(dist_assets_dir, dest_dir)
    print(f"Deployed to {dest_dir}")
if __name__ == "__main__":
    main()