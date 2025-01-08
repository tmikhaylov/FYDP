from flask import Flask, request, jsonify
import subprocess
import os
import uuid
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = '/tmp/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_file():
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

        try:
            # First command (replace with your actual command)
            first_command = f"nougat {filepath} -o data"  # Replace with the actual command
            first_result = subprocess.run(first_command, shell=True, capture_output=True, text=True)
            first_output = first_result.stdout.strip()

            # Second command (replace with your actual command)
            second_command = f"python rag.py"  # Replace with the actual command
            second_result = subprocess.run(second_command, shell=True, capture_output=True, text=True)
            second_output = second_result.stdout.strip()

            # Combine outputs or process as needed
            # combined_output = f"First command output: {first_output}\nSecond command output: {second_output}"

        finally:
            os.remove(filepath)
        print(second_output)
        return jsonify({'output': second_output})

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
