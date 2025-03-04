import os
import uuid
import shutil
import subprocess
import yaml
import json  # added for JSON persistence
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

UPLOADS_JSON_PATH = "uploaded_files.json"  # file to persist uploaded_files

######################################
# In-Memory Dictionaries with Persistence
######################################
def load_uploaded_files():
    """Load uploaded file records from JSON file."""
    if os.path.exists(UPLOADS_JSON_PATH):
        try:
            with open(UPLOADS_JSON_PATH, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}

def save_uploaded_files():
    """Save uploaded file records to JSON file."""
    with open(UPLOADS_JSON_PATH, "w") as f:
        json.dump(uploaded_files, f, indent=4)

uploaded_files = load_uploaded_files()  # mapping: upload_id -> [filepath, original_filename]
user_config = {}

######################################
# Reload JSON data on each request
######################################
@app.before_request
def reload_uploaded_files():
    global uploaded_files
    # Always load the latest version from disk
    uploaded_files = load_uploaded_files()

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
    save_uploaded_files()  # update persistent file
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
    save_uploaded_files()  # update persistent file after deletion
    return jsonify({'message': f'Document with upload_id {upload_id} deleted successfully.'}), 200

@app.route("/delete-file-manual", methods=["POST"])
def delete_file_manual():
    data = request.json
    project_id = data.get("project_id")
    filename = data.get("filename")
    if not project_id or not filename:
        return jsonify({"error": "Missing project_id or filename"}), 400

    file_path = os.path.join(BASE_PROJECTS_DIR, project_id, filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify({"message": "File removed manually"}), 200

@app.route("/capture-document", methods=["POST"])
def capture_document():
    data = request.get_json(force=True)
    camera_index = data.get("camera_index", 0)
    output_filename = data.get("output_filename", "captured_document.jpg")
    project_id = data.get("project_id", "project_1")
    should_clean = data.get("should_clean", "")

    project_folder = os.path.join(BASE_PROJECTS_DIR, project_id)
    os.makedirs(project_folder, exist_ok=True)

    # If user wants to "clean" old captured images
    if should_clean == "clean":
        for filename in os.listdir(project_folder):
            if filename.startswith("captured_document_"):
                file_path = os.path.join(project_folder, filename)
                if os.path.isfile(file_path):
                    try:
                        os.unlink(file_path)
                    except Exception as e:
                        print(f"[DEBUG] Failed to delete {file_path}. Reason: {str(e)}")

    try:
        saved_filename = capture_document_photo(camera_index, output_filename, project_id)
        upload_id = str(uuid.uuid4())
        final_path = os.path.join(project_folder, saved_filename)
        return jsonify({"upload_id": upload_id, "filename": saved_filename}), 200
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
    cap.release()
    if frame is None:
        raise RuntimeError(f"Camera open but no frame after {attempts} attempts.")

    project_folder = os.path.join(BASE_PROJECTS_DIR, project_id)
    os.makedirs(project_folder, exist_ok=True)
    output_path = os.path.join(project_folder, output_filename)
    success = cv2.imwrite(output_path, frame)
    if not success:
        raise OSError(f"OpenCV could not write file '{output_path}'.")
    return output_filename

@app.route("/capture-to-pdf", methods=["POST"])
def create_pdf():
    data = request.get_json()
    project_id = data.get('project_id')
    images = data.get('images', [])
    pdf_filename = data.get('pdf_filename', 'output.pdf')

    project_folder = os.path.join(BASE_PROJECTS_DIR, project_id)
    os.makedirs(project_folder, exist_ok=True)
    pdf_path = os.path.join(project_folder, pdf_filename)

    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        img_width, img_height = 3264, 2448
        c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))
        for image in images:
            image_path = os.path.join(project_folder, image)
            if os.path.exists(image_path):
                c.setPageSize((img_width, img_height))
                c.drawImage(image_path, 0, 0, width=img_width, height=img_height)
                c.showPage()
            else:
                print(f"Warning: {image_path} does not exist. Skipping.")
        c.save()

        # Remove captured images after PDF creation
        for image in images:
            image_path = os.path.join(project_folder, image)
            if os.path.exists(image_path):
                os.remove(image_path)

        return jsonify({
            "message": "PDF created successfully",
            "pdf_path": pdf_path.replace("\\", "/"),
            "pdf_filename": pdf_filename
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
