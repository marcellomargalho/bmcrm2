import sys
from PIL import Image

def process_logo(input_path, output_path, target_hex):
    try:
        target_r = int(target_hex[1:3], 16)
        target_g = int(target_hex[3:5], 16)
        target_b = int(target_hex[5:7], 16)

        # Open the ORIGINAL image from Downloads to avoid compounding errors
        img = Image.open(input_path).convert("RGBA")
        grayscale = img.convert("L")
        
        new_data = []
        for gray, current_pixel in zip(grayscale.getdata(), img.getdata()):
            orig_alpha = current_pixel[3]
            
            # Boost the alpha heavily. If gray is less than 230, it's basically solid.
            # We map 0-200 to solid, 200-255 to transparent, for better anti-aliasing.
            if gray > 240:
                new_alpha = 0
            else:
                # Ramp up the opacity quickly so it's not faded
                # (240 - gray) means max is 240.
                alpha_factor = (240 - gray) / 40.0
                if alpha_factor > 1.0:
                    alpha_factor = 1.0
                new_alpha = int(255 * alpha_factor)
                
            # Keep original alpha bounds
            new_alpha = int(new_alpha * (orig_alpha / 255.0))
            
            new_data.append((target_r, target_g, target_b, new_alpha))
            
        # Crop the image to remove empty white space around the logo
        img.putdata(new_data)
        
        # Crop to bounding box of non-transparent pixels
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            
        img.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    # Read from the original downloaded file, save to public
    process_logo("/Users/brendamargalho/Downloads/logo.png", "/Users/brendamargalho/Downloads/crmadv-main 2/bmcrm2/public/logo.png", "#c4986b")
