
import os

patch_file = "td_main_patch.py"
target_file = "td_to_sheets.py"

if os.path.exists(patch_file) and os.path.exists(target_file):
    with open(patch_file, "r", encoding="utf-8") as f_src:
        content = f_src.read()
    
    with open(target_file, "r", encoding="utf-8") as f_dst:
        existing = f_dst.read()
        
    if "def main():" in existing:
        print("Main block already exists. Skipping append.")
    else:
        with open(target_file, "a", encoding="utf-8") as f_dst:
            f_dst.write("\n" + content)
        print("Successfully appended main block.")
else:
    print("Files not found.")
