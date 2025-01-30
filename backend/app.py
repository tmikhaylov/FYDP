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
import threading
import time
import shutil

from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

######################################
# Paths
######################################
UPLOAD_FOLDER = 'C:/tmp/uploads'  # The initial "processing" folder
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# The final folder structure: FYDP/frontend/projects/<conversationId>/
# Adjust as necessary based on your file structure
BASE_PROJECTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "projects")
)

######################################
# In-memory dictionary for statuses
######################################
upload_status = {}
# upload_status[upload_id] = {
#   'event': threading.Event(),
#   'status': 'processing'|'finished'|'error',
#   'error': None or str,
#   'filepath': "...C:/tmp/uploads/uploadid_filename",
#   'conversation_id': "...",
#   'final_filename': "uploadid_filename"
# }

######################################
# /upload
######################################
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

    conversation_id = request.form.get('conversation_id')
    if not conversation_id:
        return jsonify({'error': 'No conversation_id provided'}), 400

    upload_id = str(uuid.uuid4())

    # Save to the tmp folder with prefix
    original_filename = secure_filename(file.filename)
    unique_filename = f"{upload_id}_{original_filename}"
    tmp_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(tmp_path)

    event = threading.Event()
    upload_status[upload_id] = {
        'event': event,
        'status': 'processing',
        'error': None,
        'filepath': tmp_path,
        'conversation_id': conversation_id,
        'final_filename': unique_filename
    }

    def background_process():
        try:
            # Simulate time-consuming "processing"
            time.sleep(3)
            upload_status[upload_id]['status'] = 'finished'

            # Copy or move the file to the final location
            conv_folder = os.path.join(BASE_PROJECTS_DIR, conversation_id)
            os.makedirs(conv_folder, exist_ok=True)

            final_path = os.path.join(conv_folder, unique_filename)
            shutil.copyfile(tmp_path, final_path)
            # If you want to move instead of copy:
            # shutil.move(tmp_path, final_path)

        except Exception as e:
            upload_status[upload_id]['status'] = 'error'
            upload_status[upload_id]['error'] = str(e)
        finally:
            event.set()

    threading.Thread(target=background_process, daemon=True).start()
    return jsonify({'upload_id': upload_id}), 200

######################################
# /status/<upload_id>
######################################
@app.route('/status/<upload_id>', methods=['GET'])
def get_status(upload_id):
    """
    Check the status of a given upload
    """
    info = upload_status.get(upload_id)
    if not info:
        return jsonify({'error': 'Invalid upload_id'}), 404

    return jsonify({
        'status': info['status'],
        'error': info['error']
    }), 200

######################################
# /execute
######################################
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

    info = upload_status.get(upload_id)
    if not info:
        return jsonify({'error': 'Invalid upload_id'}), 404

    # Wait for background "processing" to finish
    info['event'].wait()

    if info['status'] == 'error':
        return jsonify({'error': info['error']}), 400
    if info['status'] != 'finished':
        return jsonify({'error': 'Processing not finished'}), 400

    # Simulate some final logic
    time.sleep(1)
    response_text = f"Simulated response. You said: {text}"
    print(response_text)

    return jsonify({'output': response_text}), 200

######################################
if __name__ == '__main__':
    app.run(debug=True, port=5000)
