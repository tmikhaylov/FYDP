import os
import uuid
import subprocess
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests as needed

UPLOAD_FOLDER = 'C:/tmp/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# In-memory store: upload_id -> file path
uploaded_files = {}

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Generate unique ID for this upload
    upload_id = str(uuid.uuid4())

    # Secure the filename and store
    filename = secure_filename(file.filename)
    unique_filename = f"{upload_id}_{filename}"
    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)

    # Store the filepath in our dictionary
    uploaded_files[upload_id] = filepath

    # Return the upload_id for the client to reference
    return jsonify({'upload_id': upload_id}), 200

@app.route('/execute', methods=['POST'])
def execute_command():
    data = request.json
    if 'text' not in data or 'upload_id' not in data:
        return jsonify({'error': 'No text or upload_id provided'}), 400
    
    text = data['text']
    upload_id = data['upload_id']
    
    # Find the saved file path
    file_path = uploaded_files.get(upload_id)
    if not file_path:
        return jsonify({'error': 'Invalid or unknown upload_id'}), 404

    # Now we call rag.py (which does the LlamaParse or any doc parsing inside it)
    # We'll pass it the file_path and the user text
    cmd = [
        "python", "rag.py",
        "--file", 
        # "--query", text
    ]

    cmd.extend([file_path])
    cmd.extend(["--query", text])
    # Execute rag.py as a child process
    # print(subprocess.run("python --verison", capture_output=True, text=True).stdout)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout.strip())
        return jsonify({'error': result.stderr.strip()}), 400

    # Return the LLM result
    output = result.stdout.strip()
    return jsonify({'output': output}), 200

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
