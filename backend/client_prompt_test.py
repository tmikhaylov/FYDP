import requests
import os
import time

# Server URLs
upload_url = 'http://127.0.0.1:5000/upload'
execute_url = 'http://127.0.0.1:5000/execute'

# Path to the PDF file
pdf_path = 'raw_data/Canada_Wildfire_Next-Day_Spread_Prediction_Tools_Using_Deep_Learning_-_Xiang_Fang.pdf'  # Adjusted for Windows file path

# Upload the PDF
with open(pdf_path, 'rb') as file:
    files = {'file': file}
    response = requests.post(upload_url, files=files)
    print(f'Output for {pdf_path}: {response.json()}')

# Wait to ensure upload processing is complete
time.sleep(2)  # Adjust the sleep time as needed

# Text data to send in the execute command
text_data = 'What are the data categories used and what is the model architecture presented in this paper?'

# Send text data to the execute endpoint
execute_payload = {'text': text_data}
execute_response = requests.post(execute_url, json=execute_payload)

if execute_response.status_code == 200:
    print("Execution response:", execute_response.json())
else:
    print("Error:", execute_response.json())
