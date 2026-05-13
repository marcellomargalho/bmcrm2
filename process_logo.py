import sys
from PIL import Image

def process_logo(input_path, output_path, target_hex):
    try:
        # Target color: #c4986b -> (196, 152, 107)
        target_r = int(target_hex[1:3], 16)
        target_g = int(target_hex[3:5], 16)
        target_b = int(target_hex[5:7], 16)

        img = Image.open(input_path).convert("RGBA")
        grayscale = img.convert("L")
        
        new_data = []
        for gray, current_pixel in zip(grayscale.getdata(), img.getdata()):
            orig_alpha = current_pixel[3]
            
            # The darker the pixel (lower gray value), the more opaque it should be.
            # White (gray=255) becomes alpha 0. Black (gray=0) becomes alpha 255.
            # We also scale by the original alpha in case there's already some transparency.
            new_alpha = int((255 - gray) * (orig_alpha / 255.0))
            
            new_data.append((target_r, target_g, target_b, new_alpha))
            
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    process_logo("public/logo.png", "public/logo.png", "#c4986b")
