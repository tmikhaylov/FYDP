import requests
import fitz  
import os


url = 'http://127.0.0.1:5000/upload'
pdf_path = 'raw_data/bioinformatics_35_14_i127.pdf' 
image_dir = '/tmpclient/pdf_images'
os.makedirs(image_dir, exist_ok=True)

pdf_document = fitz.open(pdf_path)
image_files = []

# Convert each page to an image
for page_number in range(1):
    page = pdf_document.load_page(page_number)
    pix = page.get_pixmap()
    image_path = os.path.join(image_dir, f'page_{page_number + 1}.png')
    pix.save(image_path)
    image_files.append(image_path)

# Upload
for image_file in image_files:
    with open(image_file, 'rb') as file:
        files = {'file': file}
        response = requests.post(url, files=files)
        print(f'Output for {image_file}: {response.json()}')

# Cleanup
for image_file in image_files:
    os.remove(image_file)

os.rmdir(image_dir)
