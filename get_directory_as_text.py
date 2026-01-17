import os

def save_directory_structure(root_dir, output_file):
    """
    Recursively traverse the directory structure and write it to a file.

    :param root_dir: The root directory to start traversing from.
    :param output_file: The output text file where the directory structure will be saved.
    """
    with open(output_file, 'w') as f:
        for foldername, subfolders, filenames in os.walk(root_dir):
            # Calculate the level of the current folder for indentation
            level = foldername.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            f.write(f'{indent}{os.path.basename(foldername)}/\n')

            # Indent files to reflect the folder structure
            sub_indent = ' ' * 4 * (level + 1)
            for filename in filenames:
                f.write(f'{sub_indent}{filename}\n')

if __name__ == "__main__":
    # Replace '.' with the path to your project directory
    project_root = '.'  # Current directory, assuming the script is in the root folder of the React project
    output_file = os.path.join(project_root, 'directory_structure.txt')

    save_directory_structure(project_root, output_file)
    print(f"Directory structure saved to {output_file}")
