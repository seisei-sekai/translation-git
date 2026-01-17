import os
from PIL import Image

THUMBNAIL_SIZE = (150, 150)
THUMBNAIL_PREFIX = "thumb_"

def convert_all_to_thumbnails():
    # Get current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Loop through all files in current directory
    for filename in os.listdir(current_dir):
        # Check if file is a PNG
        if filename.lower().endswith('.png'):
            # Skip if already a thumbnail
            if filename.startswith(THUMBNAIL_PREFIX):
                continue
                
            try:
                # Open image
                image_path = os.path.join(current_dir, filename)
                with Image.open(image_path) as img:
                    # Convert RGBA to RGB if needed
                    if img.mode == 'RGBA':
                        img = img.convert('RGB')
                    
                    # Create thumbnail
                    img.thumbnail(THUMBNAIL_SIZE)
                    
                    # Create thumbnail filename
                    thumb_filename = THUMBNAIL_PREFIX + filename
                    thumb_path = os.path.join(current_dir, thumb_filename)
                    
                    # Save thumbnail with reduced quality
                    img.save(thumb_path, 'JPEG', quality=60, optimize=True)
                    
                print(f"Created thumbnail for {filename}")
                    
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")

if __name__ == "__main__":
    convert_all_to_thumbnails()
