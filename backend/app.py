# # import os
# # import uuid
# # import threading
# # import subprocess
# # from flask import Flask, request, jsonify
# # from werkzeug.utils import secure_filename

# # app = Flask(__name__)

# # UPLOAD_FOLDER = 'C:/tmp/uploads'
# # os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# # # This dict can map request_ids -> threading.Event or request_ids -> status
# # upload_status = {}

# # def convert_image_to_pdf(image_path):
# #     ...
# #     pass

# # @app.route('/upload', methods=['POST'])
# # def upload_file():
# #     if 'file' not in request.files:
# #         return jsonify({'error': 'No file part'}), 400

# #     file = request.files['file']
# #     if file.filename == '':
# #         return jsonify({'error': 'No selected file'}), 400
    
# #     # Create a unique ID for this upload
# #     upload_id = str(uuid.uuid4())
    
# #     # Secure filename
# #     filename = secure_filename(file.filename)
# #     unique_filename = f"{upload_id}_{filename}"
# #     filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
# #     file.save(filepath)
    
# #     # Start a background thread or queue to do the processing
# #     event = threading.Event()
# #     upload_status[upload_id] = {
# #         'event': event,
# #         'status': 'processing',
# #         'error': None
# #     }

# #     def background_process():
# #         try:
# #             # Convert to PDF if needed
# #             if filepath.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
# #                 new_path = convert_image_to_pdf(filepath)
# #                 os.remove(filepath)
# #                 final_path = new_path
# #             else:
# #                 final_path = filepath

# #             # Run nougat command
# #             cmd = ["nougat", final_path, "-o", "data"]
# #             result = subprocess.run(cmd, capture_output=True, text=True)
# #             if result.returncode != 0:
# #                 raise Exception(result.stderr.strip())

# #             # All done
# #             upload_status[upload_id]['status'] = 'finished'
# #         except Exception as e:
# #             upload_status[upload_id]['status'] = 'error'
# #             upload_status[upload_id]['error'] = str(e)
# #         finally:
# #             event.set()
# #             if os.path.exists(final_path):
# #                 os.remove(final_path)

# #     threading.Thread(target=background_process, daemon=True).start()
    
# #     return jsonify({'upload_id': upload_id}), 200

# # @app.route('/status/<upload_id>', methods=['GET'])
# # def get_status(upload_id):
# #     info = upload_status.get(upload_id)
# #     if not info:
# #         return jsonify({'error': 'Invalid upload_id'}), 404

# #     return jsonify({
# #         'status': info['status'],
# #         'error': info['error']
# #     }), 200

# # @app.route('/execute', methods=['POST'])
# # def execute_command():
# #     data = request.json
# #     if 'text' not in data or 'upload_id' not in data:
# #         return jsonify({'error': 'No text or upload_id provided'}), 400
    
# #     text = data['text']
# #     upload_id = data['upload_id']
    
# #     info = upload_status.get(upload_id)
# #     if not info:
# #         return jsonify({'error': 'Invalid upload_id'}), 404

# #     # Wait for processing to finish
# #     info['event'].wait()

# #     if info['status'] == 'error':
# #         return jsonify({'error': info['error']}), 400
# #     if info['status'] != 'finished':
# #         # Possibly still processing, or unknown
# #         return jsonify({'error': 'Processing not finished'}), 400

# #     # Now we can run rag.py or any other logic
# #     cmd = ["python", "rag.py", text]
# #     result = subprocess.run(cmd, capture_output=True, text=True)
# #     if result.returncode != 0:
# #         return jsonify({'error': result.stderr.strip()}), 400

# #     return jsonify({'output': result.stdout.strip()}), 200

# # if __name__ == '__main__':
# #     app.run(debug=True, host='127.0.0.1', port=5000)

# # DUMMY BACKEND STARTS HERE ##
# import os
# import uuid
# import threading
# import time
# import shutil
# import cv2
# import os
# import usb.core
# import usb.util

# from flask import Flask, request, jsonify
# from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import letter
# from werkzeug.utils import secure_filename
# from flask_cors import CORS

# app = Flask(__name__)
# CORS(app)

# ######################################
# # Paths
# ######################################
# UPLOAD_FOLDER = 'C:/tmp/uploads'  # The initial "processing" folder
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# # The final folder structure: FYDP/frontend/projects/<conversationId>/
# # Adjust as necessary based on your file structure
# BASE_PROJECTS_DIR = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "frontend", "projects")
# )

# ######################################
# # In-memory dictionary for statuses
# ######################################
# upload_status = {}
# # upload_status[upload_id] = {
# #   'event': threading.Event(),
# #   'status': 'processing'|'finished'|'error',
# #   'error': None or str,
# #   'filepath': "...C:/tmp/uploads/uploadid_filename",
# #   'conversation_id': "...",
# #   'final_filename': "uploadid_filename"
# # }

# ######################################
# # /upload
# ######################################
# @app.route('/upload', methods=['POST'])
# def upload_file():
#     """
#     Requires:
#       - file in request.files['file']
#       - conversation_id in request.form['conversation_id']

#     1. Saves the file to C:/tmp/uploads/<upload_id>_<filename>
#     2. Spawns a background thread that simulates processing,
#        then copies the file to
#        FYDP/frontend/projects/<conversation_id>/<upload_id>_<filename>.
#     3. Returns {upload_id}.
#     """
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file part'}), 400
#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No selected file'}), 400

#     conversation_id = request.form.get('conversation_id')
#     if not conversation_id:
#         return jsonify({'error': 'No conversation_id provided'}), 400

#     upload_id = str(uuid.uuid4())

#     # Save to the tmp folder with prefix
#     original_filename = secure_filename(file.filename)
#     unique_filename = f"{upload_id}_{original_filename}"
#     tmp_path = os.path.join(UPLOAD_FOLDER, unique_filename)
#     file.save(tmp_path)

#     event = threading.Event()
#     upload_status[upload_id] = {
#         'event': event,
#         'status': 'processing',
#         'error': None,
#         'filepath': tmp_path,
#         'conversation_id': conversation_id,
#         'final_filename': unique_filename
#     }

#     def background_process():
#         try:
#             # Simulate time-consuming "processing"
#             time.sleep(3)
#             upload_status[upload_id]['status'] = 'finished'

#             # Copy or move the file to the final location
#             conv_folder = os.path.join(BASE_PROJECTS_DIR, conversation_id)
#             os.makedirs(conv_folder, exist_ok=True)

#             final_path = os.path.join(conv_folder, unique_filename)
#             shutil.copyfile(tmp_path, final_path)
#             # If you want to move instead of copy:
#             # shutil.move(tmp_path, final_path)

#         except Exception as e:
#             upload_status[upload_id]['status'] = 'error'
#             upload_status[upload_id]['error'] = str(e)
#         finally:
#             event.set()

#     threading.Thread(target=background_process, daemon=True).start()
#     return jsonify({'upload_id': upload_id}), 200

# ######################################
# # /status/<upload_id>
# ######################################
# @app.route('/status/<upload_id>', methods=['GET'])
# def get_status(upload_id):
#     """
#     Check the status of a given upload
#     """
#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404

#     return jsonify({
#         'status': info['status'],
#         'error': info['error']
#     }), 200

# ######################################
# # /execute
# ######################################
# @app.route('/execute', methods=['POST'])
# def execute_command():
#     """
#     Expects JSON with { text, upload_id }.
#     Wait for background thread. 
#     Return simulated or real logic result as "output".
#     """
#     data = request.json
#     text = data.get('text')
#     upload_id = data.get('upload_id')

#     if not text or upload_id is None:
#         return jsonify({'error': 'No text or upload_id provided'}), 400

#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404

#     # Wait for background "processing" to finish
#     info['event'].wait()

#     if info['status'] == 'error':
#         return jsonify({'error': info['error']}), 400
#     if info['status'] != 'finished':
#         return jsonify({'error': 'Processing not finished'}), 400

#     # Simulate some final logic
#     time.sleep(1)
#     response_text = f"Simulated response. You said: {text}"
#     print(response_text)

#     return jsonify({'output': response_text}), 200

# def detect_ipevo_usb():
#     """
#     Try to locate the IPEVO V4K Pro by its USB vendor and product IDs.
#     Replace the IDs below with the correct values for your device.
#     """
#     VENDOR_ID = 0x1778
#     PRODUCT_ID = 0xD002

#     device = usb.core.find(idVendor=VENDOR_ID, idProduct=PRODUCT_ID)
#     if device is None:
#         print("IPEVO V4K Pro not detected via USB.")
#         return False
#     else:
#         print("IPEVO V4K Pro detected via USB!")
#         return True

# def capture_document_photo(camera_index=1, output_filename="captured_document.jpg", project_id="project_1"):
#     """
#     Captures a single frame from the specified camera and saves it to a folder 
#     named <project_id> in the same directory as this file.
#     """

#     print(f"[DEBUG] Attempting to open camera at index={camera_index}")
#     try:
#         cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
#         # set exposure
#         # cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 1)
#         # cap.set(cv2.CAP_PROP_EXPOSURE, 60)
#     except Exception as e:
#         raise RuntimeError(f"Could not initialize camera (index={camera_index}). Original error: {str(e)}")

#     if not cap.isOpened():
#         raise PermissionError(
#             f"[DEBUG] Failed to open camera index={camera_index}. "
#             "Check if the device is connected and the user has correct permissions (video group, etc.)"
#         )
    
#     desired_width = 3264
#     desired_height = 2448
#     cap.set(cv2.CAP_PROP_FRAME_WIDTH, desired_width)
#     cap.set(cv2.CAP_PROP_FRAME_HEIGHT, desired_height)

#     wait_time = 5
#     print(f"[DEBUG] Waiting {wait_time} seconds for the camera to adjust...")
#     time.sleep(wait_time)

#     # Try multiple times in case the first frame is empty
#     attempts = 5
#     frame = None
#     for attempt in range(1, attempts + 1):
#         ret, frame = cap.read()
#         if ret and frame is not None:
#             print(f"[DEBUG] Successfully grabbed a frame on attempt {attempt}.")
#             break
#         print(f"[DEBUG] Attempt {attempt}/{attempts} failed. Retrying in 1s...")
#         time.sleep(1)

#     if frame is None:
#         cap.release()
#         raise RuntimeError(
#             f"[DEBUG] Camera (index={camera_index}) is open, "
#             f"but failed to capture a frame after {attempts} attempts."
#         )

#     # Create the project directory if it doesn't exist
#     directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'))
#     try:
#         os.makedirs(directory, exist_ok=True)
#     except OSError as e:
#         cap.release()
#         raise OSError(
#             f"[DEBUG] Failed to create/access directory '{directory}'. "
#             f"Check file/folder permissions. Original error: {str(e)}"
#         )

#     # Save the captured image
#     output_path = os.path.join(directory, output_filename)
#     success = cv2.imwrite(output_path, frame)
#     cap.release()

#     if not success:
#         raise OSError(
#             f"[DEBUG] OpenCV could not write the file '{output_path}'. "
#             "Check disk space and folder permissions."
#         )

#     print(f"[DEBUG] Photo saved to {output_path}")
#     return output_filename

# @app.route("/capture-document", methods=["POST"])
# def capture_document():
#     """
#     Expects JSON body: {
#       "camera_index": 1,
#       "output_filename": "captured_document_0.jpg",
#       "project_id": "project_1"
#     }
#     """
#     print("[DEBUG] Received /capture-document request.")
#     data = request.get_json(force=True)
#     camera_index = data.get("camera_index", 1)
#     output_filename = data.get("output_filename", "captured_document.jpg")
#     project_id = data.get("project_id", "project_1")
#     should_clean = data.get("should_clean", "")
    
#     if should_clean == "clean":
#         print(f"[DEBUG] cleaning")
#         directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'))
#         for filename in os.listdir(directory):
#             file_path = os.path.join(directory, filename)
#             try:
#                 if os.path.isfile(file_path) or os.path.islink(file_path):
#                     os.unlink(file_path)
#                 elif os.path.isdir(file_path):
#                     shutil.rmtree(file_path)
#             except Exception as e:
#                 print(f"[DEBUG] Failed to delete {file_path}. Reason: {str(e)}")
#         print(f"[DEBUG] finished cleaning")

#     print(f"[DEBUG] JSON payload => camera_index: {camera_index}, "
#           f"output_filename: {output_filename}, project_id: {project_id}")

#     try:
#         saved_path = capture_document_photo(camera_index, output_filename, project_id)
#         return jsonify({"path": saved_path}), 200
#     except Exception as e:
#         error_msg = f"Capture failed: {str(e)}"
#         print(f"[DEBUG] {error_msg}")
#         return jsonify({"error": error_msg}), 500
    
# @app.route("/capture-to-pdf", methods=["POST"])
# def create_pdf():
#     data = request.get_json()
#     project_id = data.get('project_id')
#     images = data.get('images')
#     pdf_filename = data.get('pdf_filename', 'output.pdf')
#     # os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'projects', project_id, pdf_filename))
    
#     directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'))
#     pdf_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'projects', project_id))
#     os.makedirs(pdf_dir, exist_ok=True)
#     pdf_path = os.path.join(pdf_dir, pdf_filename)

#     try:
#         # Since your images are 3264x2448, we'll use those dimensions for each page.
#         img_width, img_height = 3264, 2448

#         # Create a canvas with the size of the image.
#         c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))
        
#         for image in images:
#             image_path = os.path.join(directory, image)
#             if os.path.exists(image_path):
#                 # Set the page size to the image's dimensions (useful if images might differ)
#                 c.setPageSize((img_width, img_height))
#                 # Draw the image so that it exactly fills the page.
#                 c.drawImage(image_path, 0, 0, width=img_width, height=img_height)
#                 c.showPage()
#             else:
#                 print(f"Warning: {image_path} does not exist. Skipping this image.")
        
#         c.save()
#         return jsonify({
#             "message": "PDF created successfully", 
#             "pdf_path": pdf_path.replace("\\", "/")
#         }), 200
#     except Exception as e:
#         print(f"[DEBUG] {str(e)}")
#         return jsonify({"error": str(e)}), 500

# ######################################
# if __name__ == '__main__':
#     app.run(host="127.0.0.1", debug=True, port=5000)

# # NEW BCKEND STARTS HERE ##
# import os
# import uuid
# import subprocess
# from flask import Flask, request, jsonify
# from werkzeug.utils import secure_filename
# from flask_cors import CORS
# import yaml

# # For LlamaIndex operations
# from llama_index.core import StorageContext, load_index_from_storage

# app = Flask(__name__)
# CORS(app)  # Enable CORS if needed

# # Folder where uploaded files are stored
# UPLOAD_FOLDER = 'C:/tmp/uploads'
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# # In-memory mapping: upload_id -> file path
# uploaded_files = {}

# def load_config(config_path="config.yaml"):
#     with open(config_path, "r") as file:
#         config = yaml.safe_load(file)  # Load YAML into a Python dict
#     return config

# @app.route('/upload', methods=['POST'])
# def upload_file():
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file part in the request'}), 400

#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No file selected'}), 400
    
#     # Generate a unique ID for this upload
#     upload_id = str(uuid.uuid4())

#     # Secure the filename and prepend the unique ID
#     filename = secure_filename(file.filename)
#     unique_filename = f"{upload_id}_{filename}"
#     filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
#     file.save(filepath)

#     # Save mapping: upload_id -> filepath
#     uploaded_files[upload_id] = filepath

#     # Return the upload_id (this will be used for later reference)
#     return jsonify({'upload_id': upload_id}), 200

# @app.route('/execute', methods=['POST'])
# def execute_command():
#     data = request.json
#     if 'text' not in data or 'upload_id' not in data:
#         return jsonify({'error': 'Both "text" and "upload_id" are required'}), 400
    
#     text = data['text']
#     upload_id = data['upload_id']
    
#     # Look up the file path for the given upload_id
#     file_path = uploaded_files.get(upload_id)
#     if not file_path:
#         return jsonify({'error': 'Invalid or unknown upload_id'}), 404

#     # Build the command to call rag.py.
#     # It is assumed that rag.py accepts --file and --query arguments.
#     cmd = [
#         "python", "rag.py",
#         "--file", file_path,
#         "--query", text
#     ]
    
#     result = subprocess.run(cmd, capture_output=True, text=True)
#     if result.returncode != 0:
#         print("Error output:", result.stderr.strip())
#         return jsonify({'error': result.stderr.strip()}), 400

#     output = result.stdout.strip()
#     return jsonify({'output': output}), 200

# @app.route('/delete', methods=['POST'])
# def delete_file():
#     from dotenv import load_dotenv
#     config = load_config()
#     load_dotenv()
#     os.environ["OPENAI_API_KEY"] =  config['api_key']['OPEN_AI']
    
#     data = request.json
#     if 'upload_id' not in data:
#         return jsonify({'error': 'upload_id is required'}), 400
#     upload_id = data['upload_id']
    
#     # Retrieve the file path using the upload_id
#     file_path = uploaded_files.get(upload_id)
#     if not file_path:
#         return jsonify({'error': 'Invalid or unknown upload_id'}), 404

#     # The document ID used in LlamaIndex should match the unique filename
#     # (assuming rag.py was run with filename_as_id=True).
#     doc_id = os.path.basename(file_path)

#     # Delete the file from disk
#     try:
#         os.remove(file_path)
#     except Exception as e:
#         return jsonify({'error': f'Failed to delete file from disk: {str(e)}'}), 500

#     # Determine the storage directory. If your project supports multiple projects,
#     # you can pass a "project_name" in the request; otherwise, use a default directory.
#     project_name = data.get("project_name")
#     PERSIST_DIR = os.path.join("./storage", project_name) if project_name else "./storage"

#     # If a persisted index exists, load it and delete the document
#     if os.path.exists(PERSIST_DIR):
#         try:
#             storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
#             index = load_index_from_storage(storage_context)
#             index.delete_ref_doc(doc_id, delete_from_docstore=True)
#             # Persist the updated index after deletion
#             index.storage_context.persist(persist_dir=PERSIST_DIR)
#         except Exception as e:
#             return jsonify({'error': f'Failed to delete document from index: {str(e)}'}), 500

#     # Remove the entry from our mapping
#     del uploaded_files[upload_id]
#     return jsonify({'message': f'Document with id {upload_id} deleted successfully.'}), 200

# if __name__ == '__main__':
#     app.run(debug=True, host='127.0.0.1', port=5000)

## COMBINED BACKEND STARTS HERE ##
import os
import uuid
import threading
import time
import shutil
import cv2
import usb.core
import usb.util
import subprocess
import yaml
from dotenv import load_dotenv

from flask import Flask, request, jsonify
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from werkzeug.utils import secure_filename
from llama_index.core import StorageContext, load_index_from_storage
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

######################################
# Paths and Directories
######################################
UPLOAD_FOLDER = 'C:/tmp/uploads'  # The initial "processing" folder
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Final folder structure for processed uploads:
# FYDP/frontend/projects/<conversationId>/
BASE_PROJECTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "projects")
)

######################################
# In-memory dictionary for upload statuses
######################################
upload_status = {}
# Structure:
# upload_status[upload_id] = {
#    'event': threading.Event(),
#    'status': 'processing'|'finished'|'error',
#    'error': None or str,
#    'filepath': "<tmp file path>",
#    'conversation_id': "<conversation_id>",
#    'final_filename': "<upload_id>_<filename>"
# }

######################################
# Helper: Load Config (for /delete endpoint)
######################################
def load_config(config_path="config.yaml"):
    with open(config_path, "r") as file:
        config = yaml.safe_load(file)
    return config

######################################
# /upload endpoint
######################################
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    conversation_id = request.form.get('conversation_id')
    if not conversation_id:
        return jsonify({'error': 'No conversation_id provided'}), 400

    upload_id = str(uuid.uuid4())
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
            # Simulate processing time
            time.sleep(3)
            upload_status[upload_id]['status'] = 'finished'

            # Copy file to final location in projects folder
            conv_folder = os.path.join(BASE_PROJECTS_DIR, conversation_id)
            os.makedirs(conv_folder, exist_ok=True)
            final_path = os.path.join(conv_folder, unique_filename)
            shutil.copyfile(tmp_path, final_path)
        except Exception as e:
            upload_status[upload_id]['status'] = 'error'
            upload_status[upload_id]['error'] = str(e)
        finally:
            event.set()

    threading.Thread(target=background_process, daemon=True).start()
    return jsonify({'upload_id': upload_id}), 200

######################################
# /status/<upload_id> endpoint
######################################
@app.route('/status/<upload_id>', methods=['GET'])
def get_status(upload_id):
    info = upload_status.get(upload_id)
    if not info:
        return jsonify({'error': 'Invalid upload_id'}), 404
    return jsonify({
        'status': info['status'],
        'error': info['error']
    }), 200

######################################
# /execute endpoint (with AI integration)
######################################
@app.route('/execute', methods=['POST'])
def execute_command():
    data = request.json
    text = data.get('text')
    upload_id = data.get('upload_id')
    if not text or upload_id is None:
        return jsonify({'error': 'No text or upload_id provided'}), 400

    info = upload_status.get(upload_id)
    if not info:
        return jsonify({'error': 'Invalid upload_id'}), 404

    # Wait for processing to finish
    info['event'].wait()
    if info['status'] == 'error':
        return jsonify({'error': info['error']}), 400
    if info['status'] != 'finished':
        return jsonify({'error': 'Processing not finished'}), 400

    # Determine the final file path (copied to projects folder)
    conversation_id = info['conversation_id']
    unique_filename = info['final_filename']
    final_path = os.path.join(BASE_PROJECTS_DIR, conversation_id, unique_filename)

    # Build command to call rag.py for AI processing.
    cmd = [
        "python", "rag.py",
        "--file", final_path,
        "--query", text
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        response_text = f"Simulated response. You said: {text}"
    else:
        response_text = result.stdout.strip() or f"Simulated response. You said: {text}"
    time.sleep(1)
    print(response_text)
    return jsonify({'output': response_text}), 200

def detect_ipevo_usb():
    """
    Try to locate the IPEVO V4K Pro by its USB vendor and product IDs.
    Replace the IDs below with the correct values for your device.
    """
    VENDOR_ID = 0x1778
    PRODUCT_ID = 0xD002

    device = usb.core.find(idVendor=VENDOR_ID, idProduct=PRODUCT_ID)
    if device is None:
        print("IPEVO V4K Pro not detected via USB.")
        return False
    else:
        print("IPEVO V4K Pro detected via USB!")
        return True

######################################
# /capture-document endpoint
######################################
@app.route("/capture-document", methods=["POST"])
def capture_document():
    print("[DEBUG] Received /capture-document request.")
    data = request.get_json(force=True)
    camera_index = data.get("camera_index", 1)
    output_filename = data.get("output_filename", "captured_document.jpg")
    project_id = data.get("project_id", "project_1")
    should_clean = data.get("should_clean", "")
    
    if should_clean == "clean":
        print("[DEBUG] cleaning")
        directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'projects', project_id, 'new_pdf'))
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"[DEBUG] Failed to delete {file_path}. Reason: {str(e)}")
        print("[DEBUG] finished cleaning")

    print(f"[DEBUG] JSON payload => camera_index: {camera_index}, output_filename: {output_filename}, project_id: {project_id}")

    try:
        saved_path = capture_document_photo(camera_index, output_filename, project_id)
        return jsonify({"path": saved_path}), 200
    except Exception as e:
        error_msg = f"Capture failed: {str(e)}"
        print(f"[DEBUG] {error_msg}")
        return jsonify({"error": error_msg}), 500

######################################
# /capture-to-pdf endpoint
######################################
@app.route("/capture-to-pdf", methods=["POST"])
def create_pdf():
    data = request.get_json()
    project_id = data.get('project_id')
    images = data.get('images')
    pdf_filename = data.get('pdf_filename', 'output.pdf')
    
    directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'projects', project_id, 'new_pdf'))
    pdf_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'projects', project_id))
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, pdf_filename)

    try:
        img_width, img_height = 3264, 2448
        c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))
        
        for image in images:
            image_path = os.path.join(directory, image)
            if os.path.exists(image_path):
                c.setPageSize((img_width, img_height))
                c.drawImage(image_path, 0, 0, width=img_width, height=img_height)
                c.showPage()
            else:
                print(f"Warning: {image_path} does not exist. Skipping this image.")
        
        c.save()
        return jsonify({
            "message": "PDF created successfully", 
            "pdf_path": pdf_path.replace("\\", "/")
        }), 200
    except Exception as e:
        print(f"[DEBUG] {str(e)}")
        return jsonify({"error": str(e)}), 500

######################################
# /delete endpoint
######################################
@app.route('/delete', methods=['POST'])
def delete_file():
    # Load configuration and set OPENAI_API_KEY
    config = load_config()
    load_dotenv()
    os.environ["OPENAI_API_KEY"] = config['api_key']['OPEN_AI']
    
    data = request.json
    if 'upload_id' not in data:
        return jsonify({'error': 'upload_id is required'}), 400
    upload_id = data['upload_id']
    
    info = upload_status.get(upload_id)
    if not info:
        return jsonify({'error': 'Invalid or unknown upload_id'}), 404
    file_path = info.get('filepath')
    
    # Use the unique filename as the document ID
    doc_id = os.path.basename(file_path)
    
    # Delete the file from disk
    try:
        os.remove(file_path)
    except Exception as e:
        return jsonify({'error': f'Failed to delete file from disk: {str(e)}'}), 500

    # Determine storage directory for LlamaIndex (if applicable)
    project_name = data.get("project_name")
    PERSIST_DIR = os.path.join("./storage", project_name) if project_name else "./storage"

    if os.path.exists(PERSIST_DIR):
        try:
            storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
            index = load_index_from_storage(storage_context)
            index.delete_ref_doc(doc_id, delete_from_docstore=True)
            index.storage_context.persist(persist_dir=PERSIST_DIR)
        except Exception as e:
            return jsonify({'error': f'Failed to delete document from index: {str(e)}'}), 500

    del upload_status[upload_id]
    return jsonify({'message': f'Document with id {upload_id} deleted successfully.'}), 200

######################################
# Helper: capture_document_photo function
######################################
def capture_document_photo(camera_index=1, output_filename="captured_document.jpg", project_id="project_1"):
    print(f"[DEBUG] Attempting to open camera at index={camera_index}")
    try:
        cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    except Exception as e:
        raise RuntimeError(f"Could not initialize camera (index={camera_index}). Original error: {str(e)}")

    if not cap.isOpened():
        raise PermissionError(
            f"[DEBUG] Failed to open camera index={camera_index}. "
            "Check if the device is connected and the user has correct permissions."
        )
    
    desired_width = 3264
    desired_height = 2448
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, desired_width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, desired_height)

    wait_time = 5
    print(f"[DEBUG] Waiting {wait_time} seconds for the camera to adjust...")
    time.sleep(wait_time)

    attempts = 5
    frame = None
    for attempt in range(1, attempts + 1):
        ret, frame = cap.read()
        if ret and frame is not None:
            print(f"[DEBUG] Successfully grabbed a frame on attempt {attempt}.")
            break
        print(f"[DEBUG] Attempt {attempt}/{attempts} failed. Retrying in 1s...")
        time.sleep(1)

    if frame is None:
        cap.release()
        raise RuntimeError(
            f"[DEBUG] Camera (index={camera_index}) is open, "
            f"but failed to capture a frame after {attempts} attempts."
        )

    directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'projects', project_id, 'new_pdf'))
    try:
        os.makedirs(directory, exist_ok=True)
    except OSError as e:
        cap.release()
        raise OSError(
            f"[DEBUG] Failed to create/access directory '{directory}'. Original error: {str(e)}"
        )

    output_path = os.path.join(directory, output_filename)
    success = cv2.imwrite(output_path, frame)
    cap.release()

    if not success:
        raise OSError(
            f"[DEBUG] OpenCV could not write the file '{output_path}'. Check disk space and permissions."
        )

    print(f"[DEBUG] Photo saved to {output_path}")
    return output_filename

######################################
if __name__ == '__main__':
    app.run(host="127.0.0.1", debug=True, port=5000)
