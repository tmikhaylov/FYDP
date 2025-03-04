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
# import os
# import uuid
# import threading
# import time
# import shutil
# import cv2
# import usb.core
# import usb.util
# import subprocess
# import yaml
# from dotenv import load_dotenv

# from flask import Flask, request, jsonify
# from reportlab.pdfgen import canvas
# from reportlab.lib.pagesizes import letter
# from werkzeug.utils import secure_filename
# from flask_cors import CORS

# # For LlamaIndex operations
# from llama_index.core import StorageContext, load_index_from_storage

# app = Flask(__name__)
# CORS(app)

# ######################################
# # Paths and Directories
# ######################################
# UPLOAD_FOLDER = 'C:/tmp/uploads'  # The initial "processing" folder
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# # Final folder structure for processed uploads:
# # FYDP/frontend/projects/<conversationId>/
# BASE_PROJECTS_DIR = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "frontend", "projects")
# )

# ######################################
# # In-memory dictionary for upload statuses
# ######################################
# # upload_status[upload_id] = {
# #   'event': threading.Event(),
# #   'status': 'processing'|'finished'|'error',
# #   'error': None or str,
# #   'filepath': "<tmp file path>",
# #   'conversation_id': "<conversation_id>",
# #   'final_filename': "<upload_id>_<filename>"
# # }
# upload_status = {}

# ######################################
# # Helper: Load config for /delete
# ######################################
# def load_config(config_path="config.yaml"):
#     with open(config_path, "r") as file:
#         config = yaml.safe_load(file)
#     return config

# ######################################
# # /upload endpoint
# ######################################
# @app.route('/upload', methods=['POST'])
# def upload_file():
#     """
#     1. Expects 'file' in request.files
#     2. Expects 'conversation_id' in request.form
#     3. Saves file to tmp folder => starts background thread => copies file to final folder
#     4. Returns { upload_id }
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

#     try:
#         # Simulate or do time-consuming processing
#         upload_status[upload_id]['status'] = 'finished'

#         # Copy file to final location in /projects/<conversation_id>/
#         conv_folder = os.path.join(BASE_PROJECTS_DIR, conversation_id)
#         os.makedirs(conv_folder, exist_ok=True)
#         final_path = os.path.join(conv_folder, unique_filename)
#         shutil.copyfile(tmp_path, final_path)
#     except Exception as e:
#         upload_status[upload_id]['status'] = 'error'
#         upload_status[upload_id]['error'] = str(e)
#     finally:
#         event.set()

#     return jsonify({'upload_id': upload_id}), 200

# ######################################
# # /status/<upload_id> endpoint
# ######################################
# @app.route('/status/<upload_id>', methods=['GET'])
# def get_status(upload_id):
#     """
#     Check the status of a given upload (processing, finished, error)
#     """
#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404
#     return jsonify({
#         'status': info['status'],
#         'error': info['error']
#     }), 200

# ######################################
# # /execute endpoint => Real AI logic
# ######################################
# @app.route('/execute', methods=['POST'])
# def execute_command():
#     """
#     Expects JSON: { text, upload_id }
#     1. Waits for background upload to finish
#     2. If success, calls rag.py with final file path => returns rag.py stdout
#     3. If rag.py fails, return error
#     """
#     data = request.json
#     text = data.get('text')
#     upload_id = data.get('upload_id')
#     if not text or upload_id is None:
#         return jsonify({'error': 'No text or upload_id provided'}), 400

#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404

#     # Wait for the background "processing" to finish
#     info['event'].wait()
#     if info['status'] == 'error':
#         return jsonify({'error': info['error']}), 400
#     if info['status'] != 'finished':
#         return jsonify({'error': 'Processing not finished'}), 400

#     # Build the final path
#     conversation_id = info['conversation_id']
#     unique_filename = info['final_filename']
#     final_path = os.path.join(BASE_PROJECTS_DIR, conversation_id, unique_filename)

#     # Call rag.py
#     cmd = [
#         "python", "rag.py",
#         "--file", final_path,
#         "--query", text
#     ]
#     result = subprocess.run(cmd, capture_output=True, text=True)

#     if result.returncode != 0:
#         # Return error from rag.py
#         err_msg = result.stderr.strip() or "Error running rag.py"
#         print("Error output:", err_msg)
#         return jsonify({'error': err_msg}), 400

#     # Return AI response from rag.py
#     output = result.stdout.strip()
#     return jsonify({'output': output}), 200

# ######################################
# # /capture-document endpoint
# ######################################
# @app.route("/capture-document", methods=["POST"])
# def capture_document():
#     """
#     Expects JSON: { camera_index, output_filename, project_id, should_clean }
#     Captures image from camera => saves to /projects/<project_id>/new_pdf/
#     """
#     data = request.get_json(force=True)
#     camera_index = data.get("camera_index", 1)
#     output_filename = data.get("output_filename", "captured_document.jpg")
#     project_id = data.get("project_id", "project_1")
#     should_clean = data.get("should_clean", "")

#     if should_clean == "clean":
#         directory = os.path.abspath(os.path.join(
#             os.path.dirname(__file__), '..', 'frontend', 'projects', project_id, 'new_pdf'
#         ))
#         if os.path.exists(directory):
#             for filename in os.listdir(directory):
#                 file_path = os.path.join(directory, filename)
#                 try:
#                     if os.path.isfile(file_path) or os.path.islink(file_path):
#                         os.unlink(file_path)
#                     elif os.path.isdir(file_path):
#                         shutil.rmtree(file_path)
#                 except Exception as e:
#                     print(f"[DEBUG] Failed to delete {file_path}. Reason: {str(e)}")

#     try:
#         saved_path = capture_document_photo(camera_index, output_filename, project_id)
#         return jsonify({"path": saved_path}), 200
#     except Exception as e:
#         error_msg = f"Capture failed: {str(e)}"
#         return jsonify({"error": error_msg}), 500

# ######################################
# # /capture-to-pdf endpoint
# ######################################
# @app.route("/capture-to-pdf", methods=["POST"])
# def create_pdf():
#     data = request.get_json()
#     project_id = data.get('project_id')
#     images = data.get('images')
#     pdf_filename = data.get('pdf_filename', 'output.pdf')

#     directory = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'projects', project_id, 'new_pdf'
#     ))
#     pdf_dir = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'projects', project_id
#     ))
#     os.makedirs(pdf_dir, exist_ok=True)
#     pdf_path = os.path.join(pdf_dir, pdf_filename)

#     try:
#         # Use image size 3264x2448
#         from reportlab.pdfgen import canvas
#         from reportlab.lib.pagesizes import letter
#         img_width, img_height = 3264, 2448
#         c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))

#         for image in images:
#             image_path = os.path.join(directory, image)
#             if os.path.exists(image_path):
#                 c.setPageSize((img_width, img_height))
#                 c.drawImage(image_path, 0, 0, width=img_width, height=img_height)
#                 c.showPage()
#             else:
#                 print(f"Warning: {image_path} does not exist. Skipping.")
#         c.save()
#         return jsonify({
#             "message": "PDF created successfully",
#             "pdf_path": pdf_path.replace("\\", "/")
#         }), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# ######################################
# # /delete endpoint
# ######################################
# @app.route('/delete', methods=['POST'])
# def delete_file():
#     # Load config & set OPENAI_API_KEY
#     config = load_config()
#     load_dotenv()
#     os.environ["OPENAI_API_KEY"] = config['api_key']['OPEN_AI']

#     data = request.json
#     if 'upload_id' not in data:
#         return jsonify({'error': 'upload_id is required'}), 400
#     upload_id = data['upload_id']

#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid or unknown upload_id'}), 404
#     file_path = info.get('filepath')

#     # doc_id => unique filename
#     doc_id = os.path.basename(file_path)

#     # Delete file from disk
#     try:
#         os.remove(file_path)
#     except Exception as e:
#         return jsonify({'error': f'Failed to delete file from disk: {str(e)}'}), 500

#     # Possibly remove from LlamaIndex
#     project_name = data.get("project_name")
#     PERSIST_DIR = os.path.join("./storage", project_name) if project_name else "./storage"

#     if os.path.exists(PERSIST_DIR):
#         try:
#             storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
#             index = load_index_from_storage(storage_context)
#             index.delete_ref_doc(doc_id, delete_from_docstore=True)
#             index.storage_context.persist(persist_dir=PERSIST_DIR)
#         except Exception as e:
#             return jsonify({'error': f'Failed to delete doc from index: {str(e)}'}), 500

#     # Remove from our dictionary
#     del upload_status[upload_id]
#     return jsonify({'message': f'Document with id {upload_id} deleted successfully.'}), 200

# ######################################
# # Helper: capture_document_photo
# ######################################
# def capture_document_photo(camera_index=1, output_filename="captured_document.jpg", project_id="project_1"):
#     print(f"[DEBUG] Attempting to open camera at index={camera_index}")
#     try:
#         cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
#     except Exception as e:
#         raise RuntimeError(f"Could not initialize camera (index={camera_index}). Original error: {str(e)}")

#     if not cap.isOpened():
#         raise PermissionError(
#             f"[DEBUG] Failed to open camera index={camera_index}. "
#             "Check if device is connected and user has correct permissions."
#         )

#     desired_width = 3264
#     desired_height = 2448
#     cap.set(cv2.CAP_PROP_FRAME_WIDTH, desired_width)
#     cap.set(cv2.CAP_PROP_FRAME_HEIGHT, desired_height)

#     wait_time = 5
#     print(f"[DEBUG] Waiting {wait_time} seconds for the camera to adjust...")
#     time.sleep(wait_time)

#     attempts = 5
#     frame = None
#     for attempt in range(1, attempts + 1):
#         ret, frame = cap.read()
#         if ret and frame is not None:
#             print(f"[DEBUG] Successfully grabbed frame on attempt {attempt}.")
#             break
#         print(f"[DEBUG] Attempt {attempt}/{attempts} failed. Retrying in 1s...")
#         time.sleep(1)

#     if frame is None:
#         cap.release()
#         raise RuntimeError(
#             f"[DEBUG] Camera (index={camera_index}) open but no frame after {attempts} attempts."
#         )

#     directory = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'projects', project_id, 'new_pdf'
#     ))
#     try:
#         os.makedirs(directory, exist_ok=True)
#     except OSError as e:
#         cap.release()
#         raise OSError(
#             f"[DEBUG] Failed to create/access directory '{directory}'. Original error: {str(e)}"
#         )

#     output_path = os.path.join(directory, output_filename)
#     success = cv2.imwrite(output_path, frame)
#     cap.release()

#     if not success:
#         raise OSError(
#             f"[DEBUG] OpenCV could not write file '{output_path}'. Check disk space & permissions."
#         )

#     print(f"[DEBUG] Photo saved to {output_path}")
#     return output_filename

# ######################################
# if __name__ == '__main__':
#     app.run(host="127.0.0.1", debug=True, port=5000)

## NEWER COMBINED BACKEND ##
# import os
# import uuid
# import shutil
# import subprocess
# import yaml
# from dotenv import load_dotenv
# from flask import Flask, request, jsonify
# from werkzeug.utils import secure_filename
# from flask_cors import CORS
# from llama_index.core import StorageContext, load_index_from_storage
# # from process_image import unskew_and_divide_pipeline  # if you use it

# # Initialize Flask and enable CORS
# app = Flask(__name__)
# CORS(app)

# ######################################
# # Paths and Directories
# ######################################
# # Folder where uploaded files are stored (temporary location)
# UPLOAD_FOLDER = 'C:/tmp/uploads'
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# # Final folder structure for processed uploads:
# # For example, files will be copied to: FYDP/frontend/public/projects/<project_id>/
# BASE_PROJECTS_DIR = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "projects")
# )

# ######################################
# # In-Memory Dictionaries
# ######################################
# # Mapping: uploaded_files[upload_id] = [filepath, filename]
# uploaded_files = {}

# # Global configuration for LLM, vector store, and API keys.
# user_config = {}

# # Dictionary to track upload status if needed.
# # (You might remove this if not used further.)
# upload_status = {}

# ######################################
# # Helper: load_config
# ######################################
# def load_config(config_path="config.yaml"):
#     with open(config_path, "r") as file:
#         config = yaml.safe_load(file)
#     return config

# # Load config and set required environment variables
# load_dotenv()
# config = load_config()
# os.environ["OPENAI_API_KEY"] = config['api_key']['OPEN_AI']

# ######################################
# # /set_config endpoint
# ######################################
# @app.route('/set_config', methods=['POST'])
# def set_config():
#     data = request.json
#     if not data:
#         return jsonify({'error': 'No configuration provided'}), 400
#     global user_config
#     user_config = data
#     return jsonify({'message': 'Configuration updated successfully.', 'config': user_config}), 200

# ######################################
# # /create_project endpoint
# ######################################
# @app.route('/create_project', methods=['POST'])
# def create_project():
#     data = request.json
#     if 'project_id' not in data:
#         return jsonify({'error': 'project_id is required'}), 400
#     project_id = data['project_id']
#     persist_dir = os.path.join("./storage", project_id)
#     if os.path.exists(persist_dir):
#         return jsonify({'error': 'Project already exists'}), 400
#     os.makedirs(persist_dir, exist_ok=True)
#     try:
#         from llama_index.core import VectorStoreIndex
#         # Initialize an empty index for conversational queries.
#         index = VectorStoreIndex.from_documents([])
#         index.storage_context.persist(persist_dir=persist_dir)
#     except Exception as e:
#         return jsonify({'error': f'Failed to create project index: {str(e)}'}), 500
#     return jsonify({'message': f'Project "{project_id}" created successfully.'}), 200

# ######################################
# # /upload endpoint
# ######################################
# @app.route('/upload', methods=['POST'])
# def upload_file():
#     """
#     Expects:
#       - request.form['project_id']
#       - request.files['file']
#     Saves the file to UPLOAD_FOLDER (temporary location), then immediately copies it
#     to the final location: BASE_PROJECTS_DIR/<project_id>/<upload_id>_<filename>.
#     Returns JSON: { "upload_id", "filename", "project_id" }.
#     """
#     # Get project_id from form data (required)
#     project_id = request.form.get("project_id")
#     if not project_id:
#         return jsonify({'error': 'project_id is required'}), 400

#     if 'file' not in request.files:
#         return jsonify({'error': 'No file part in the request'}), 400

#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No file selected'}), 400

#     # Generate unique upload_id and secure the filename
#     upload_id = str(uuid.uuid4())
#     filename = secure_filename(file.filename)
#     unique_filename = f"{upload_id}_{filename}"

#     # Save file temporarily
#     tmp_path = os.path.join(UPLOAD_FOLDER, unique_filename)
#     file.save(tmp_path)
#     print("tmp_path = ", tmp_path)

#     # Save mapping for later lookup
#     uploaded_files[upload_id] = [tmp_path, filename]

#     # Update status dictionary (if needed by other endpoints)
#     upload_status[upload_id] = {
#         'status': 'finished',
#         'error': None,
#         'filepath': tmp_path,
#         'project_id': project_id,
#         'final_filename': unique_filename
#     }

#     # Copy file from temporary location to final destination
#     try:
#         project_folder = os.path.join(BASE_PROJECTS_DIR, project_id)
#         os.makedirs(project_folder, exist_ok=True)
#         final_path = os.path.join(project_folder, unique_filename)
#         shutil.copyfile(tmp_path, final_path)
#     except Exception as e:
#         upload_status[upload_id]['status'] = 'error'
#         upload_status[upload_id]['error'] = str(e)

#     return jsonify({'upload_id': upload_id, 'filename': unique_filename, 'project_id': project_id}), 200

# ######################################
# # /status/<upload_id> endpoint
# ######################################
# @app.route('/status/<upload_id>', methods=['GET'])
# def get_status(upload_id):
#     info = upload_status.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404
#     return jsonify({
#         'status': info['status'],
#         'error': info['error']
#     }), 200

# @app.route('/get_filename/<upload_id>', methods=['GET'])
# def get_filename_from_upload_id(upload_id):
#     info = uploaded_files.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404
#     return jsonify({
#         'filename': info[1],
#         'filepath': info[0]
#     }), 200

# ######################################
# # /execute endpoint
# ######################################
# @app.route('/execute', methods=['POST'])
# def execute_command():
#     """
#     Execute a conversational query using the chat engine.
#     Expects JSON with:
#       - "text": the query text,
#       - "project_id": to identify which project's index to query,
#       - Optionally, "upload_id": if a new document should be ingested.
#     If upload_id is provided, --file is added to the command.
#     """
#     data = request.json
#     if 'text' not in data or 'project_id' not in data:
#         return jsonify({'error': 'Both "text" and "project_id" are required'}), 400

#     text = data['text']
#     project_id = data['project_id']
#     upload_id = data.get("upload_id")  # Optional

#     persist_dir = os.path.join("./storage", project_id)
#     if not os.path.exists(persist_dir):
#         return jsonify({'error': f'Project "{project_id}" does not exist. Please create it first.'}), 400

#     cmd = [
#         "python", "rag_temp.py",
#         "--project_id", project_id,
#         "--query", text,
#         "--vector_store", user_config.get("vector_store", "local"),
#         "--llm", user_config.get("llm", "openai"),
#         "--chat"
#     ]
#     with_file = False
#     if upload_id:
#         with_file = True
#         file_path = uploaded_files.get(upload_id)[0]
#         if not file_path:
#             return jsonify({'error': 'Invalid or unknown upload_id'}), 404
#         cmd.extend(["--file", file_path])

#     env = os.environ.copy()
#     if "openai_api_key" in user_config:
#         env["OPENAI_API_KEY"] = user_config["openai_api_key"]
#     if "cohere_api_key" in user_config:
#         env["COHERE_API_KEY"] = user_config["cohere_api_key"]
#     if "pinecone_api_key" in user_config:
#         env["PINECONE_API_KEY"] = user_config["pinecone_api_key"]

#     result = subprocess.run(cmd, capture_output=True, text=True, env=env)
#     if result.returncode != 0:
#         err_msg = result.stderr.strip() or "Error running rag_temp.py"
#         print("Error:", err_msg)
#         return jsonify({'error': err_msg}), 400

#     output_lines = result.stdout.strip().splitlines()
#     output = '\n'.join(output_lines[1:]) if with_file else '\n'.join(output_lines)
#     return jsonify({'output': output}), 200

# ######################################
# # /delete endpoint
# ######################################
# @app.route('/delete', methods=['POST'])
# def delete_file():
#     """
#     Delete a document from a project.
#     Expects JSON with "upload_id" and "project_id".
#     Removes the file from disk and from the LlamaIndex (if applicable).
#     """
#     data = request.json
#     if 'upload_id' not in data or 'project_id' not in data:
#         return jsonify({'error': 'upload_id and project_id are required'}), 400
#     upload_id = data['upload_id']
#     project_id = data['project_id']
#     file_path = uploaded_files.get(upload_id)[0]
#     if not file_path:
#         return jsonify({'error': 'Invalid or unknown upload_id'}), 404

#     doc_id = os.path.basename(file_path)
#     try:
#         os.remove(file_path)
#     except Exception as e:
#         return jsonify({'error': f'Failed to delete file from disk: {str(e)}'}), 500

#     persist_dir = os.path.join("./storage", project_id)
#     if os.path.exists(persist_dir):
#         try:
#             storage_context = StorageContext.from_defaults(persist_dir=persist_dir)
#             index = load_index_from_storage(storage_context)
#             index.delete_ref_doc(doc_id, delete_from_docstore=True)
#             index.storage_context.persist(persist_dir=persist_dir)
#         except Exception as e:
#             return jsonify({'error': f'Failed to delete document from index: {str(e)}'}), 500

#     del uploaded_files[upload_id]
#     return jsonify({'message': f'Document with upload_id {upload_id} deleted successfully.'}), 200

# ######################################
# # /capture-document endpoint (unchanged)
# ######################################
# @app.route("/capture-document", methods=["POST"])
# def capture_document():
#     """
#     Expects JSON: { "camera_index", "output_filename", "project_id", "should_clean" }
#     Captures an image from the camera and saves it to:
#       /frontend/public/projects/<project_id>/new_pdf/
#     """
#     data = request.get_json(force=True)
#     camera_index = data.get("camera_index", 0)
#     output_filename = data.get("output_filename", "captured_document.jpg")
#     project_id = data.get("project_id", "project_1")
#     should_clean = data.get("should_clean", "")

#     if should_clean == "clean":
#         directory = os.path.abspath(os.path.join(
#             os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
#         ))
#         if os.path.exists(directory):
#             for filename in os.listdir(directory):
#                 file_path = os.path.join(directory, filename)
#                 try:
#                     if os.path.isfile(file_path) or os.path.islink(file_path):
#                         os.unlink(file_path)
#                     elif os.path.isdir(file_path):
#                         shutil.rmtree(file_path)
#                 except Exception as e:
#                     print(f"[DEBUG] Failed to delete {file_path}. Reason: {str(e)}")
#     try:
#         saved_path = capture_document_photo(camera_index, output_filename, project_id)
#         return jsonify({"path": saved_path}), 200
#     except Exception as e:
#         error_msg = f"Capture failed: {str(e)}"
#         return jsonify({"error": error_msg}), 500

# ######################################
# # /capture-to-pdf endpoint (unchanged)
# ######################################
# @app.route("/capture-to-pdf", methods=["POST"])
# def create_pdf():
#     data = request.get_json()
#     project_id = data.get('project_id')
#     images = data.get('images')
#     pdf_filename = data.get('pdf_filename', 'output.pdf')

#     directory = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
#     ))
#     pdf_dir = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id
#     ))
#     os.makedirs(pdf_dir, exist_ok=True)
#     pdf_path = os.path.join(pdf_dir, pdf_filename)

#     try:
#         from reportlab.pdfgen import canvas
#         from reportlab.lib.pagesizes import letter
#         img_width, img_height = 3264, 2448
#         c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))
#         for image in images:
#             image_path = os.path.join(directory, image)
#             if os.path.exists(image_path):
#                 c.setPageSize((img_width, img_height))
#                 c.drawImage(image_path, 0, 0, width=img_width, height=img_height)
#                 c.showPage()
#             else:
#                 print(f"Warning: {image_path} does not exist. Skipping.")
#         c.save()
#         return jsonify({
#             "message": "PDF created successfully",
#             "pdf_path": pdf_path.replace("\\", "/")
#         }), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# ######################################
# # Helper: capture_document_photo (unchanged)
# ######################################
# def capture_document_photo(camera_index=0, output_filename="captured_document.jpg", project_id="project_1"):
#     import cv2
#     import time
#     print(f"[DEBUG] Attempting to open camera at index={camera_index}")
#     try:
#         cap = cv2.VideoCapture(camera_index)  # For Windows, you might use cv2.CAP_DSHOW
#     except Exception as e:
#         raise RuntimeError(f"Could not initialize camera (index={camera_index}). Original error: {str(e)}")
#     if not cap.isOpened():
#         raise PermissionError(
#             f"[DEBUG] Failed to open camera index={camera_index}. Check if device is connected and user has correct permissions."
#         )
#     desired_width = 3264
#     desired_height = 2448
#     cap.set(cv2.CAP_PROP_FRAME_WIDTH, desired_width)
#     cap.set(cv2.CAP_PROP_FRAME_HEIGHT, desired_height)
#     wait_time = 5
#     print(f"[DEBUG] Waiting {wait_time} seconds for the camera to adjust...")
#     time.sleep(wait_time)
#     attempts = 5
#     frame = None
#     for attempt in range(1, attempts + 1):
#         ret, frame = cap.read()
#         if ret and frame is not None:
#             print(f"[DEBUG] Successfully grabbed frame on attempt {attempt}.")
#             break
#         print(f"[DEBUG] Attempt {attempt}/{attempts} failed. Retrying in 1s...")
#         time.sleep(1)
#     if frame is None:
#         cap.release()
#         raise RuntimeError(
#             f"[DEBUG] Camera (index={camera_index}) open but no frame after {attempts} attempts."
#         )
#     directory = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
#     ))
#     os.makedirs(directory, exist_ok=True)
#     output_path = os.path.join(directory, output_filename)
#     success = cv2.imwrite(output_path, frame)
#     cap.release()
#     if not success:
#         raise OSError(
#             f"[DEBUG] OpenCV could not write file '{output_path}'. Check disk space & permissions."
#         )
#     print(f"[DEBUG] Photo saved to {output_path}")
#     return output_filename

# ######################################
# if __name__ == '__main__':
#     app.run(debug=True, host='127.0.0.1', port=5000)

## FINAL VERSION OF BACKEND ##
# import os
# import uuid
# import shutil
# import subprocess
# import yaml
# from dotenv import load_dotenv
# from flask import Flask, request, jsonify
# from werkzeug.utils import secure_filename
# from flask_cors import CORS
# from llama_index.core import StorageContext, load_index_from_storage
# import openai
# import threading
# import wave
# import pyaudio
# # from process_image import unskew_and_divide_pipeline  # Uncomment if needed

# # Initialize Flask and enable CORS
# app = Flask(__name__)
# CORS(app)

# ######################################
# # Paths and Directories
# ######################################
# # Instead of a separate temporary folder,
# # files will be stored directly under BASE_PROJECTS_DIR:
# # Final folder: <BASE_PROJECTS_DIR>/<project_id>/<upload_id>_<filename>
# BASE_PROJECTS_DIR = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "projects")
# )
# os.makedirs(BASE_PROJECTS_DIR, exist_ok=True)

# ######################################
# # In-Memory Dictionaries
# ######################################
# # Mapping: uploaded_files[upload_id] = filepath
# uploaded_files = {}

# # Global configuration for LLM, vector store, and API keys.
# user_config = {}

# ######################################
# # Helper: load_config
# ######################################
# def load_config(config_path="config.yaml"):
#     with open(config_path, "r") as file:
#         config = yaml.safe_load(file)
#     return config

# # Load config and set environment variable for OpenAI
# load_dotenv()
# config = load_config()
# os.environ["OPENAI_API_KEY"] = config['api_key']['OPEN_AI']
# openai.api_key = os.environ["OPENAI_API_KEY"]

# CHUNK = 1024
# FORMAT = pyaudio.paInt16
# CHANNELS = 1
# RATE = 44100

# is_recording = False
# frames = []
# audio_thread = None

# TEMP_WAV_PATH = "output.wav"

# def record_audio():
#     """Background thread: Capture audio from the mic until 'is_recording' is False."""
#     global frames

#     p = pyaudio.PyAudio()
#     stream = p.open(format=FORMAT,
#                     channels=CHANNELS,
#                     rate=RATE,
#                     input=True,
#                     frames_per_buffer=CHUNK)

#     while is_recording:
#         data = stream.read(CHUNK)
#         frames.append(data)

#     stream.stop_stream()
#     stream.close()
#     p.terminate()

# @app.route("/start-recording", methods=["POST"])
# def start_recording():
#     global is_recording, frames, audio_thread

#     if is_recording:
#         return jsonify({"error": "Recording is already in progress."}), 400

#     frames = []
#     is_recording = True

#     # Launch audio capture in a background thread
#     audio_thread = threading.Thread(target=record_audio, daemon=True)
#     audio_thread.start()

#     return jsonify({"message": "Recording started."}), 200

# @app.route("/stop-recording", methods=["POST"])
# def stop_recording():
#     global is_recording, audio_thread

#     if not is_recording:
#         return jsonify({"error": "No active recording to stop."}), 400

#     # Signal the background thread to stop, then wait for it
#     is_recording = False
#     audio_thread.join()

#     # Write frames to a temporary WAV file
#     if os.path.exists(TEMP_WAV_PATH):
#         os.remove(TEMP_WAV_PATH)

#     p = pyaudio.PyAudio()
#     wf = wave.open(TEMP_WAV_PATH, "wb")
#     wf.setnchannels(CHANNELS)
#     wf.setsampwidth(p.get_sample_size(FORMAT))
#     wf.setframerate(RATE)
#     wf.writeframes(b"".join(frames))
#     wf.close()
#     p.terminate()

#     # Send the WAV file to OpenAI's Whisper API
#     # Available methods:
#     #   openai.Audio.transcribe("whisper-1", file)
#     # or openai.Audio.translate("whisper-1", file) if you want translation to English.
#     try:
#         with open(TEMP_WAV_PATH, "rb") as audio_file:
#             # transcribe in original language
#             transcript = openai.Audio.transcribe("whisper-1", audio_file)
#             # or:
#             # transcript = openai.Audio.translate("whisper-1", audio_file) # to English
#     except Exception as e:
#         return jsonify({
#             "error": "OpenAI Whisper API call failed",
#             "details": str(e)
#         }), 500

#     # The recognized text is in transcript["text"]
#     recognized_text = transcript.get("text", "")

#     # Optionally remove the local WAV file if you prefer
#     # os.remove(TEMP_WAV_PATH)

#     return jsonify({
#         "message": "Recording stopped. Transcription complete (using OpenAI Whisper API).",
#         "transcript": recognized_text
#     }), 200

# ######################################
# # /set_config endpoint
# ######################################
# @app.route('/set_config', methods=['POST'])
# def set_config():
#     data = request.json
#     if not data:
#         return jsonify({'error': 'No configuration provided'}), 400
#     global user_config
#     user_config = data
#     return jsonify({'message': 'Configuration updated successfully.', 'config': user_config}), 200

# ######################################
# # /create_project endpoint
# ######################################
# @app.route('/create_project', methods=['POST'])
# def create_project():
#     data = request.json
#     if 'project_id' not in data:
#         return jsonify({'error': 'project_id is required'}), 400
#     project_id = data['project_id']
#     persist_dir = os.path.join("./storage", project_id)
#     if os.path.exists(persist_dir):
#         return jsonify({'error': 'Project already exists'}), 400
#     os.makedirs(persist_dir, exist_ok=True)
#     try:
#         from llama_index.core import VectorStoreIndex
#         # Initialize an empty index for conversational queries.
#         index = VectorStoreIndex.from_documents([])
#         index.storage_context.persist(persist_dir=persist_dir)
#     except Exception as e:
#         return jsonify({'error': f'Failed to create project index: {str(e)}'}), 500
#     return jsonify({'message': f'Project "{project_id}" created successfully.'}), 200

# ######################################
# # /upload endpoint
# ######################################
# @app.route('/upload', methods=['POST'])
# def upload_file():
#     """
#     Expects:
#       - request.form['project_id']
#       - request.files['file']
#     Saves the file directly to:
#       BASE_PROJECTS_DIR/<project_id>/<upload_id>_<filename>
#     Returns JSON: { "upload_id", "filename", "project_id" }.
#     """
#     project_id = request.form.get("project_id")
#     if not project_id:
#         return jsonify({'error': 'project_id is required'}), 400

#     if 'file' not in request.files:
#         return jsonify({'error': 'No file part in the request'}), 400

#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No file selected'}), 400

#     upload_id = str(uuid.uuid4())
#     filename = secure_filename(file.filename)
#     unique_filename = f"{upload_id}_{filename}"

#     # Build final destination: BASE_PROJECTS_DIR/<project_id>/
#     project_folder = os.path.join(BASE_PROJECTS_DIR, project_id)
#     os.makedirs(project_folder, exist_ok=True)
#     final_path = os.path.join(project_folder, unique_filename)

#     # Save the file directly to the final destination
#     file.save(final_path)
#     print("File saved to:", final_path)

#     # Record the file path in our mapping for later reference.
#     uploaded_files[upload_id] = [final_path, filename]

#     return jsonify({'upload_id': upload_id, 'filename': unique_filename, 'project_id': project_id}), 200

# ######################################
# # /get_filename/<upload_id> endpoint
# ######################################
# @app.route('/get_filename/<upload_id>', methods=['GET'])
# def get_filename_from_upload_id(upload_id):
#     info = uploaded_files.get(upload_id)
#     if not info:
#         return jsonify({'error': 'Invalid upload_id'}), 404
#     return jsonify({
#         'filename': info[1],
#         'filepath': info[0]
#     }), 200

# ######################################
# # /execute endpoint
# ######################################
# @app.route('/execute', methods=['POST'])
# def execute_command():
#     """
#     Execute a conversational query using the chat engine.
#     Expects JSON with:
#       - "text": the query text,
#       - "project_id": to identify which project's index to query,
#       - Optionally, "upload_id": if a new document should be ingested.
#     If upload_id is provided, the --file argument is added to the command.
#     """
#     data = request.json
#     if 'text' not in data or 'project_id' not in data:
#         return jsonify({'error': 'Both "text" and "project_id" are required'}), 400

#     text = data['text']
#     project_id = data['project_id']
#     upload_id = data.get("upload_id")  # Optional

#     persist_dir = os.path.join("./storage", project_id)
#     if not os.path.exists(persist_dir):
#         return jsonify({'error': f'Project "{project_id}" does not exist. Please create it first.'}), 400

#     cmd = [
#         "python", "rag_temp.py",
#         "--project_id", project_id,
#         "--query", text,
#         "--vector_store", user_config.get("vector_store", "local"),
#         "--llm", user_config.get("llm", "openai"),
#         "--chat"
#     ]
#     if upload_id:
#         file_path = uploaded_files.get(upload_id)[0]
#         if not file_path:
#             return jsonify({'error': 'Invalid or unknown upload_id'}), 404
#         cmd.extend(["--file", file_path])

#     env = os.environ.copy()
#     if "openai_api_key" in user_config:
#         env["OPENAI_API_KEY"] = user_config["openai_api_key"]
#     if "cohere_api_key" in user_config:
#         env["COHERE_API_KEY"] = user_config["cohere_api_key"]
#     if "pinecone_api_key" in user_config:
#         env["PINECONE_API_KEY"] = user_config["pinecone_api_key"]

#     result = subprocess.run(cmd, capture_output=True, text=True, env=env)
#     if result.returncode != 0:
#         err_msg = result.stderr.strip() or "Error running rag_temp.py"
#         print("Error:", err_msg)
#         return jsonify({'error': err_msg}), 400

#     output_lines = result.stdout.strip().splitlines()
#     output = '\n'.join(output_lines)
#     return jsonify({'output': output}), 200

# ######################################
# # /delete endpoint
# ######################################
# @app.route('/delete', methods=['POST'])
# def delete_file():
#     """
#     Delete a document from a project.
#     Expects JSON with "upload_id" and "project_id".
#     Removes the file from disk and from the LlamaIndex (if applicable).
#     """
#     data = request.json
#     if 'upload_id' not in data or 'project_id' not in data:
#         return jsonify({'error': 'upload_id and project_id are required'}), 400
#     upload_id = data['upload_id']
#     project_id = data['project_id']
#     file_path = uploaded_files.get(upload_id)[0]
#     if not file_path:
#         return jsonify({'error': 'Invalid or unknown upload_id'}), 404

#     doc_id = os.path.basename(file_path)
#     try:
#         os.remove(file_path)
#     except Exception as e:
#         return jsonify({'error': f'Failed to delete file from disk: {str(e)}'}), 500

#     persist_dir = os.path.join("./storage", project_id)
#     if os.path.exists(persist_dir):
#         try:
#             storage_context = StorageContext.from_defaults(persist_dir=persist_dir)
#             index = load_index_from_storage(storage_context)
#             index.delete_ref_doc(doc_id, delete_from_docstore=True)
#             index.storage_context.persist(persist_dir=persist_dir)
#         except Exception as e:
#             return jsonify({'error': f'Failed to delete document from index: {str(e)}'}), 500

#     del uploaded_files[upload_id]
#     return jsonify({'message': f'Document with upload_id {upload_id} deleted successfully.'}), 200

# ######################################
# # /capture-document endpoint (unchanged)
# ######################################
# @app.route("/capture-document", methods=["POST"])
# def capture_document():
#     """
#     Expects JSON: { "camera_index", "output_filename", "project_id", "should_clean" }
#     Captures an image from the camera and saves it to:
#       BASE_PROJECTS_DIR/<project_id>/new_pdf/
#     """
#     data = request.get_json(force=True)
#     camera_index = data.get("camera_index", 0)
#     output_filename = data.get("output_filename", "captured_document.jpg")
#     project_id = data.get("project_id", "project_1")
#     should_clean = data.get("should_clean", "")

#     if should_clean == "clean":
#         directory = os.path.abspath(os.path.join(
#             os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
#         ))
#         if os.path.exists(directory):
#             for filename in os.listdir(directory):
#                 file_path = os.path.join(directory, filename)
#                 try:
#                     if os.path.isfile(file_path) or os.path.islink(file_path):
#                         os.unlink(file_path)
#                     elif os.path.isdir(file_path):
#                         shutil.rmtree(file_path)
#                 except Exception as e:
#                     print(f"[DEBUG] Failed to delete {file_path}. Reason: {str(e)}")
#     try:
#         saved_path = capture_document_photo(camera_index, output_filename, project_id)
#         return jsonify({"path": saved_path}), 200
#     except Exception as e:
#         error_msg = f"Capture failed: {str(e)}"
#         return jsonify({"error": error_msg}), 500

# ######################################
# # /capture-to-pdf endpoint (unchanged)
# ######################################
# @app.route("/capture-to-pdf", methods=["POST"])
# def create_pdf():
#     data = request.get_json()
#     project_id = data.get('project_id')
#     images = data.get('images')
#     pdf_filename = data.get('pdf_filename', 'output.pdf')

#     directory = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
#     ))
#     pdf_dir = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id
#     ))
#     os.makedirs(pdf_dir, exist_ok=True)
#     pdf_path = os.path.join(pdf_dir, pdf_filename)

#     try:
#         from reportlab.pdfgen import canvas
#         from reportlab.lib.pagesizes import letter
#         img_width, img_height = 3264, 2448
#         c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))
#         for image in images:
#             image_path = os.path.join(directory, image)
#             if os.path.exists(image_path):
#                 c.setPageSize((img_width, img_height))
#                 c.drawImage(image_path, 0, 0, width=img_width, height=img_height)
#                 c.showPage()
#             else:
#                 print(f"Warning: {image_path} does not exist. Skipping.")
#         c.save()
#         return jsonify({
#             "message": "PDF created successfully",
#             "pdf_path": pdf_path.replace("\\", "/")
#         }), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# ######################################
# # Helper: capture_document_photo (unchanged)
# ######################################
# def capture_document_photo(camera_index=0, output_filename="captured_document.jpg", project_id="project_1"):
#     import cv2
#     import time
#     print(f"[DEBUG] Attempting to open camera at index={camera_index}")
#     try:
#         cap = cv2.VideoCapture(camera_index)  # For Windows, you might use cv2.CAP_DSHOW
#     except Exception as e:
#         raise RuntimeError(f"Could not initialize camera (index={camera_index}). Original error: {str(e)}")
#     if not cap.isOpened():
#         raise PermissionError(
#             f"[DEBUG] Failed to open camera index={camera_index}. Check if device is connected and user has correct permissions."
#         )
#     desired_width = 3264
#     desired_height = 2448
#     cap.set(cv2.CAP_PROP_FRAME_WIDTH, desired_width)
#     cap.set(cv2.CAP_PROP_FRAME_HEIGHT, desired_height)
#     wait_time = 5
#     print(f"[DEBUG] Waiting {wait_time} seconds for the camera to adjust...")
#     time.sleep(wait_time)
#     attempts = 5
#     frame = None
#     for attempt in range(1, attempts + 1):
#         ret, frame = cap.read()
#         if ret and frame is not None:
#             print(f"[DEBUG] Successfully grabbed frame on attempt {attempt}.")
#             break
#         print(f"[DEBUG] Attempt {attempt}/{attempts} failed. Retrying in 1s...")
#         time.sleep(1)
#     if frame is None:
#         cap.release()
#         raise RuntimeError(
#             f"[DEBUG] Camera (index={camera_index}) open but no frame after {attempts} attempts."
#         )
#     directory = os.path.abspath(os.path.join(
#         os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
#     ))
#     os.makedirs(directory, exist_ok=True)
#     output_path = os.path.join(directory, output_filename)
#     success = cv2.imwrite(output_path, frame)
#     cap.release()
#     if not success:
#         raise OSError(
#             f"[DEBUG] OpenCV could not write file '{output_path}'. Check disk space & permissions."
#         )
#     print(f"[DEBUG] Photo saved to {output_path}")
#     return output_filename

# ######################################
# if __name__ == '__main__':
#     app.run(debug=True, host='127.0.0.1', port=5000)

## FINAL 2.0 VERSION OF BACKEND ##
# backend/app.py
# backend/app.py
import os
import uuid
import shutil
import subprocess
import yaml
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from llama_index.core import StorageContext, load_index_from_storage
import openai
from openai import OpenAI
import threading
import wave
import pyaudio

# Initialize Flask and enable CORS
app = Flask(__name__)
CORS(app)

######################################
# Paths and Directories
######################################
BASE_PROJECTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "projects")
)
os.makedirs(BASE_PROJECTS_DIR, exist_ok=True)

######################################
# In-Memory Dictionaries
######################################
uploaded_files = {}  # mapping: upload_id -> [filepath, original_filename]
user_config = {}

######################################
# Helper: load_config
######################################
def load_config(config_path="config.yaml"):
    with open(config_path, "r") as file:
        config = yaml.safe_load(file)
    return config

load_dotenv()
config = load_config()
os.environ["OPENAI_API_KEY"] = config['api_key']['OPEN_AI']
openai.api_key = os.environ["OPENAI_API_KEY"]

CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100

is_recording = False
frames = []
audio_thread = None

TEMP_WAV_PATH = "output.wav"

def record_audio():
    global frames
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)
    while is_recording:
        data = stream.read(CHUNK)
        frames.append(data)
    stream.stop_stream()
    stream.close()
    p.terminate()

@app.route("/start-recording", methods=["POST"])
def start_recording():
    global is_recording, frames, audio_thread
    if is_recording:
        return jsonify({"error": "Recording is already in progress."}), 400
    frames = []
    is_recording = True
    audio_thread = threading.Thread(target=record_audio, daemon=True)
    audio_thread.start()
    return jsonify({"message": "Recording started."}), 200

@app.route("/stop-recording", methods=["POST"])
def stop_recording():
    global is_recording, audio_thread
    if not is_recording:
        return jsonify({"error": "No active recording to stop."}), 400
    is_recording = False
    audio_thread.join()
    if os.path.exists(TEMP_WAV_PATH):
        os.remove(TEMP_WAV_PATH)
    p = pyaudio.PyAudio()
    wf = wave.open(TEMP_WAV_PATH, "wb")
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b"".join(frames))
    wf.close()
    p.terminate()

    client = OpenAI()
    try:
        with open(TEMP_WAV_PATH, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(model="whisper-1", file=audio_file, response_format="text")
    except Exception as e:
        print(str(e))
        return jsonify({"error": "OpenAI Whisper API call failed", "details": str(e)}), 500
    recognized_text = transcript
    return jsonify({
        "message": "Recording stopped. Transcription complete.",
        "transcript": recognized_text
    }), 200

@app.route('/set_config', methods=['POST'])
def set_config():
    data = request.json
    if not data:
        return jsonify({'error': 'No configuration provided'}), 400
    global user_config
    user_config = data
    return jsonify({'message': 'Configuration updated successfully.', 'config': user_config}), 200

@app.route('/create_project', methods=['POST'])
def create_project():
    data = request.json
    if 'project_id' not in data:
        return jsonify({'error': 'project_id is required'}), 400
    project_id = data['project_id']
    persist_dir = os.path.join("./storage", project_id)
    if os.path.exists(persist_dir):
        return jsonify({'error': 'Project already exists'}), 400
    os.makedirs(persist_dir, exist_ok=True)
    try:
        from llama_index.core import VectorStoreIndex
        index = VectorStoreIndex.from_documents([])
        index.storage_context.persist(persist_dir=persist_dir)
    except Exception as e:
        return jsonify({'error': f'Failed to create project index: {str(e)}'}), 500
    return jsonify({'message': f'Project "{project_id}" created successfully.'}), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    project_id = request.form.get("project_id")
    if not project_id:
        return jsonify({'error': 'project_id is required'}), 400
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    upload_id = str(uuid.uuid4())
    filename = secure_filename(file.filename)
    unique_filename = f"{upload_id}_{filename}"
    project_folder = os.path.join(BASE_PROJECTS_DIR, project_id)
    os.makedirs(project_folder, exist_ok=True)
    final_path = os.path.join(project_folder, unique_filename)
    file.save(final_path)
    uploaded_files[upload_id] = [final_path, filename]  # store actual filename
    return jsonify({'upload_id': upload_id, 'filename': unique_filename, 'project_id': project_id}), 200

@app.route('/get_filename/<upload_id>', methods=['GET'])
def get_filename_from_upload_id(upload_id):
    info = uploaded_files.get(upload_id)
    if not info:
        return jsonify({'error': 'Invalid upload_id'}), 404
    return jsonify({
        'filename': info[1],
        'filepath': info[0]
    }), 200

@app.route('/execute', methods=['POST'])
def execute_command():
    data = request.json
    if 'text' not in data or 'project_id' not in data:
        return jsonify({'error': 'Both "text" and "project_id" are required'}), 400
    text = data['text']
    project_id = data['project_id']
    upload_id = data.get("upload_id")
    persist_dir = os.path.join("./storage", project_id)
    if not os.path.exists(persist_dir):
        return jsonify({'error': f'Project "{project_id}" does not exist. Please create it first.'}), 400
    cmd = [
        "python", "rag_temp.py",
        "--project_id", project_id,
        "--query", text,
        "--vector_store", user_config.get("vector_store", "local"),
        "--llm", user_config.get("llm", "openai"),
        "--chat"
    ]
    have_file = False
    if upload_id:
        have_file = True
        file_info = uploaded_files.get(upload_id)
        if not file_info:
            return jsonify({'error': 'Invalid or unknown upload_id'}), 404
        cmd.extend(["--file", file_info[0]])
    env = os.environ.copy()
    if "openai_api_key" in user_config:
        env["OPENAI_API_KEY"] = user_config["openai_api_key"]
    if "cohere_api_key" in user_config:
        env["COHERE_API_KEY"] = user_config["cohere_api_key"]
    if "pinecone_api_key" in user_config:
        env["PINECONE_API_KEY"] = user_config["pinecone_api_key"]
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        err_msg = result.stderr.strip() or "Error running rag_temp.py"
        return jsonify({'error': err_msg}), 400
    if have_file:
        output = result.stdout.strip().splitlines()[1:]
    else:
        output = result.stdout.strip().splitlines()
    output = '\n'.join(output)
    return jsonify({'output': output}), 200

@app.route('/delete', methods=['POST'])
def delete_file():
    data = request.json
    if 'upload_id' not in data or 'project_id' not in data:
        return jsonify({'error': 'upload_id and project_id are required'}), 400
    upload_id = data['upload_id']
    project_id = data['project_id']
    file_info = uploaded_files.get(upload_id)
    if not file_info:
        return jsonify({'error': 'Invalid or unknown upload_id'}), 404
    file_path = file_info[0]
    doc_id = os.path.basename(file_path)
    try:
        os.remove(file_path)
    except Exception as e:
        return jsonify({'error': f'Failed to delete file from disk: {str(e)}'}), 500
    persist_dir = os.path.join("./storage", project_id)
    if os.path.exists(persist_dir):
        try:
            storage_context = StorageContext.from_defaults(persist_dir=persist_dir)
            index = load_index_from_storage(storage_context)
            index.delete_ref_doc(doc_id, delete_from_docstore=True)
            index.storage_context.persist(persist_dir=persist_dir)
        except Exception as e:
            return jsonify({'error': f'Failed to delete document from index: {str(e)}'}), 500
    del uploaded_files[upload_id]
    return jsonify({'message': f'Document with upload_id {upload_id} deleted successfully.'}), 200

@app.route("/capture-document", methods=["POST"])
def capture_document():
    data = request.get_json(force=True)
    camera_index = data.get("camera_index", 0)
    output_filename = data.get("output_filename", "captured_document.jpg")
    project_id = data.get("project_id", "project_1")
    should_clean = data.get("should_clean", "")
    if should_clean == "clean":
        directory = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
        ))
        if os.path.exists(directory):
            for filename in os.listdir(directory):
                file_path = os.path.join(directory, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f"[DEBUG] Failed to delete {file_path}. Reason: {str(e)}")
    try:
        saved_filename = capture_document_photo(camera_index, output_filename, project_id)
        # Build final destination path for the captured image
        project_folder = os.path.join(BASE_PROJECTS_DIR, project_id)
        os.makedirs(project_folder, exist_ok=True)
        unique_filename = f"{str(uuid.uuid4())}_{saved_filename}"
        src_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf', saved_filename
        ))
        dest_path = os.path.join(project_folder, unique_filename)
        shutil.move(src_path, dest_path)
        # Save to in-memory mapping with original filename
        upload_id = str(uuid.uuid4())
        uploaded_files[upload_id] = [dest_path, saved_filename]
        return jsonify({"upload_id": upload_id, "filename": unique_filename}), 200
    except Exception as e:
        return jsonify({"error": f"Capture failed: {str(e)}"}), 500

def capture_document_photo(camera_index=0, output_filename="captured_document.jpg", project_id="project_1"):
    import cv2
    import time
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise PermissionError(f"Failed to open camera index={camera_index}.")
    desired_width = 3264
    desired_height = 2448
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, desired_width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, desired_height)
    time.sleep(5)
    attempts = 5
    frame = None
    for attempt in range(1, attempts + 1):
        ret, frame = cap.read()
        if ret and frame is not None:
            break
        time.sleep(1)
    if frame is None:
        cap.release()
        raise RuntimeError(f"Camera open but no frame after {attempts} attempts.")
    directory = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id, 'new_pdf'
    ))
    os.makedirs(directory, exist_ok=True)
    output_path = os.path.join(directory, output_filename)
    success = cv2.imwrite(output_path, frame)
    cap.release()
    if not success:
        raise OSError(f"OpenCV could not write file '{output_path}'.")
    return output_filename

@app.route("/capture-to-pdf", methods=["POST"])
def create_pdf():
    data = request.get_json()
    project_id = data.get('project_id')
    images = data.get('images')
    pdf_filename = data.get('pdf_filename', 'output.pdf')

    directory = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id
    ))
    pdf_dir = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', 'frontend', 'public', 'projects', project_id
    ))
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, pdf_filename)

    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        img_width, img_height = 3264, 2448
        c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))
        for image in images:
            image_path = os.path.join(directory, image)
            if os.path.exists(image_path):
                c.setPageSize((img_width, img_height))
                c.drawImage(image_path, 0, 0, width=img_width, height=img_height)
                c.showPage()
            else:
                print(f"Warning: {image_path} does not exist. Skipping.")
        c.save()
        return jsonify({
            "message": "PDF created successfully",
            "pdf_path": pdf_path.replace("\\", "/")
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
