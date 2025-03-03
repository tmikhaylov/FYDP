import os
import requests

BASE_URL = "http://127.0.0.1:5000"

def test_set_config():
    """
    Set configuration for LLM, vector store, and API keys.
    Defaults: llm='openai', vector_store='local'.
    """
    config = {
        "llm": "openai",
        "vector_store": "local",
        "openai_api_key": "your_openai_api_key_here"  # Replace with a valid key for testing
    }
    url = f"{BASE_URL}/set_config"
    response = requests.post(url, json=config)
    print("Set Config Response:", response.status_code, response.json())
    return config

def test_create_project(project_id):
    """
    Create a new project. This initializes a new persistent index for conversation.
    """
    url = f"{BASE_URL}/create_project"
    payload = {"project_id": project_id}
    response = requests.post(url, json=payload)
    print("Create Project Response:", response.status_code, response.json())
    return response.json()

def test_upload_file(project_id, file_path):
    """
    Upload a file associated with a given project.
    Returns a JSON payload that includes 'upload_id' and the unique filename.
    """
    url = f"{BASE_URL}/upload"
    # Note: We pass project_id as form data
    files = {"file": open(file_path, "rb")}
    data = {"project_id": project_id}
    response = requests.post(url, files=files, data=data)
    print("Upload File Response:", response.status_code, response.json())
    return response.json()

def test_execute(upload_id=None, project_id="", query_text=""):
    """
    Execute a conversational query using the chat engine.
    The request must include the upload_id and project_id.
    """
    url = f"{BASE_URL}/execute"
    payload = {
        "upload_id": upload_id,
        "project_id": project_id,
        "text": query_text
    }
    response = requests.post(url, json=payload)
    print("Execute Response:", response.status_code, response.json())
    return response.json()

def test_delete(upload_id, project_id):
    """
    Delete the document from both disk and the project's persistent index.
    """
    url = f"{BASE_URL}/delete"
    payload = {"upload_id": upload_id, "project_id": project_id}
    response = requests.post(url, json=payload)
    print("Delete Response:", response.status_code, response.json())
    return response.json()

def main():
    # Set a project name and test file path.
    project_id = "test_project"
    test_file_path = "/Users/timurmikhaylov/Downloads/testing.pdf"
    
    # Create a dummy PDF file if it doesn't exist.
    # if not os.path.exists(test_file_path):
    #     with open(test_file_path, "wb") as f:
    #         f.write(b"%PDF-1.4\n%Test PDF File\n1 0 obj\n<< /Type /Catalog >>\nendobj\n")
    #     print(f"Created dummy file: {test_file_path}")
    
    # Run the tests sequentially.
    config = test_set_config()
    project_resp = test_create_project(project_id)
    
    upload_resp = test_upload_file(project_id, test_file_path)
    upload_id = upload_resp.get("upload_id")
    if not upload_id:
        print("File upload failed; exiting test.")
        return

    query_text = "Tell me about this document."
    exec_resp = test_execute(upload_id, project_id, query_text)
    test_execute(project_id=project_id, query_text="But he hasn't gotten any interviews for new grad")
    
    # Finally, test deletion.
    del_resp = test_delete(upload_id, project_id)
    
if __name__ == "__main__":
    main()