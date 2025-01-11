import requests

# Server URLs
upload_url = 'http://127.0.0.1:5000/upload'
execute_url = 'http://127.0.0.1:5000/execute'

# Path to your PDF file
pdf_path = 'raw_data/Canada_Wildfire_Next-Day_Spread_Prediction_Tools_Using_Deep_Learning_-_Xiang_Fang.pdf'

def main():
    # 1) Upload the file
    with open(pdf_path, 'rb') as file:
        response = requests.post(upload_url, files={'file': file})
    
    if response.status_code == 200:
        upload_result = response.json()
        print("Upload successful. Server response:")
        print(upload_result)
        # Extract the upload_id from the response
        upload_id = upload_result.get("upload_id")
    else:
        print("Upload failed. Server response:")
        print(response.json())
        return

    # 2) Execute command on the server
    # We must provide both 'text' and 'upload_id'
    text_data = "What are the data categories used and what is the model architecture presented in this paper?"
    execute_payload = {
        'upload_id': upload_id,
        'text': text_data
    }
    print("\nSending text to /execute endpoint...")
    execute_response = requests.post(execute_url, json=execute_payload)
    
    if execute_response.status_code == 200:
        print("Execution successful. Server response:")
        print(execute_response.json())
    else:
        print("Execution failed. Server response:")
        print(execute_response.json())

if __name__ == '__main__':
    main()
