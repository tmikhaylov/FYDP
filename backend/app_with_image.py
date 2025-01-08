from flask import Flask, request, jsonify
import subprocess
import os
import uuid
import threading
from PIL import Image

app = Flask(__name__)

UPLOAD_FOLDER = 'C:/tmp/uploads'  # Adjusted for Windows file path
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Shared variable to track the completion of the first command
first_command_finished = threading.Event()

def convert_image_to_pdf(image_path):
    image = Image.open(image_path)
    pdf_path = os.path.splitext(image_path)[0] + '.pdf'
    image.convert('RGB').save(pdf_path)
    return pdf_path

@app.route('/upload', methods=['POST'])
def upload_file():
    first_command_finished.clear()  # Clear the event for new requests

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        # Generate a unique filename to avoid collisions
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)

        # Check if the file is an image, and convert to PDF if it is
        if filepath.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
            filepath = convert_image_to_pdf(filepath)

        try:
            first_command = f"nougat {filepath} -o data"  
            first_result = subprocess.run(first_command, shell=True, capture_output=True, text=True)
            first_output = first_result.stdout.strip()

            # Indicate that the first command has finished
            first_command_finished.set()

            # Combine outputs or process as needed
            combined_output = f"First command output: {first_output}"
        finally:
            os.remove(filepath)
        
        return jsonify({'output': combined_output})

@app.route('/execute', methods=['POST'])
def execute_command():
    data = request.json
    if 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']

    # Wait for the first command to finish
    first_command_finished.wait()

    try:
        # Replace with your actual Python script and use `text` as needed
        python_command = f"python rag.py \"{text}\""  # Adjusted for Windows
        result = subprocess.run(python_command, shell=True, capture_output=True, text=True)
        output = result.stdout.strip()
        error = result.stderr.strip()
        print(output)
        print(error)
        if result.returncode != 0:
            return jsonify({'error': error}), 400
        return jsonify({'output': output})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
