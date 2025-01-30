# import os
# import uuid
# import threading
# import subprocess
# from flask import Flask, request, jsonify
# from werkzeug.utils import secure_filename

# app = Flask(__name__)

# UPLOAD_FOLDER = 'C:/tmp/uploads'
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# # This dict can map request_ids -> threading.Event or request_ids -> status
# upload_status = {}

# def convert_image_to_pdf(image_path):
#     ...
#     pass

# @app.route('/upload', methods=['POST'])
# def upload_file():
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file part'}), 400

#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No selected file'}), 400
    
#     # Create a unique ID for this upload
#     upload_id = str(uuid.uuid4())
    
#     # Secure filename
#     filename = secure_filename(file.filename)
#     unique_filename = f"{upload_id}_{filename}"
#     filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
#     file.save(filepath)
    
#     # Start a background thread or queue to do the processing
#     event = threading.Event()
#     upload_status[upload_id] = {
#         'event': event,
#         'status': 'processing',
#         'error': None
#     }

#     def background_process():
#         try:
#             # Convert to PDF if needed
#             if filepath.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
#                 new_path = convert_image_to_pdf(filepath)
#                 os.remove(filepath)
#                 final_path = new_path
#             else:
#                 final_path = filepath

#             # Run nougat command
#             cmd = ["nougat", final_path, "-o", "data"]
#             result = subprocess.run(cmd, capture_output=True, text=True)
#             if result.returncode != 0:
#                 raise Exception(result.stderr.strip())

#             # All done
#             upload_status[upload_id]['status'] = 'finished'
#         except Exception as e:
#             upload_status[upload_id]['status'] = 'error'
#             upload_status[upload_id]['error'] = str(e)
#         finally:
#             event.set()
#             if os.path.exists(final_path):
#                 os.remove(final_path)

#     threading.Thread(target=background_process, daemon=True).start()
    
#     return jsonify({'upload_id': upload_id}), 200

# @app.route('/status/<upload_id>', methods=['GET'])
# def get_status(upload_id):
#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404

#     return jsonify({
#         'status': info['status'],
#         'error': info['error']
#     }), 200

# @app.route('/execute', methods=['POST'])
# def execute_command():
#     data = request.json
#     if 'text' not in data or 'upload_id' not in data:
#         return jsonify({'error': 'No text or upload_id provided'}), 400
    
#     text = data['text']
#     upload_id = data['upload_id']
    
#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404

#     # Wait for processing to finish
#     info['event'].wait()

#     if info['status'] == 'error':
#         return jsonify({'error': info['error']}), 400
#     if info['status'] != 'finished':
#         # Possibly still processing, or unknown
#         return jsonify({'error': 'Processing not finished'}), 400

#     # Now we can run rag.py or any other logic
#     cmd = ["python", "rag.py", text]
#     result = subprocess.run(cmd, capture_output=True, text=True)
#     if result.returncode != 0:
#         return jsonify({'error': result.stderr.strip()}), 400

#     return jsonify({'output': result.stdout.strip()}), 200

# if __name__ == '__main__':
#     app.run(debug=True, host='127.0.0.1', port=5000)

import os
import uuid
import time
import shutil

from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)

######################################
# Paths
######################################
UPLOAD_FOLDER = 'C:/tmp/uploads'  # The initial "processing" folder
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# This dict can map request_ids -> threading.Event or request_ids -> status
upload_status = {}

def convert_image_to_pdf(image_path):
    ...
    pass

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Requires:
      - file in request.files['file']
      - conversation_id in request.form['conversation_id']

    1. Saves the file to C:/tmp/uploads/<upload_id>_<filename>
    2. Spawns a background thread that simulates processing,
       then copies the file to
       FYDP/frontend/projects/<conversation_id>/<upload_id>_<filename>.
    3. Returns {upload_id}.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Generate unique ID for this upload
    upload_id = str(uuid.uuid4())
    
    # Secure filename
    filename = secure_filename(file.filename)
    unique_filename = f"{upload_id}_{filename}"
    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)
    
    # Start a background thread or queue to do the processing
    event = threading.Event()
    upload_status[upload_id] = {
        'event': event,
        'status': 'processing',
        'error': None
    }

    def background_process():
        try:
            # Convert to PDF if needed
            if filepath.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
                new_path = convert_image_to_pdf(filepath)
                os.remove(filepath)
                final_path = new_path
            else:
                final_path = filepath

            # Run nougat command
            cmd = ["nougat", final_path, "-o", "data"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(result.stderr.strip())

            # All done
            upload_status[upload_id]['status'] = 'finished'
        except Exception as e:
            upload_status[upload_id]['status'] = 'error'
            upload_status[upload_id]['error'] = str(e)
        finally:
            event.set()
            if os.path.exists(final_path):
                os.remove(final_path)

    threading.Thread(target=background_process, daemon=True).start()
    
    return jsonify({'upload_id': upload_id}), 200

@app.route('/status/<upload_id>', methods=['GET'])
def get_status(upload_id):
    info = upload_status.get(upload_id)
    if not info:
        return jsonify({'error': 'Invalid upload_id'}), 404

    return jsonify({
        'status': info['status'],
        'error': info['error']
    }), 200

@app.route('/execute', methods=['POST'])
def execute_command():
    """
    Expects JSON with { text, upload_id }.
    Wait for background thread. 
    Return simulated or real logic result as "output".
    """
    data = request.json
    text = data.get('text')
    upload_id = data.get('upload_id')

    if not text or upload_id is None:
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

######################################
if __name__ == '__main__':
    app.run(debug=True, port=5000)
