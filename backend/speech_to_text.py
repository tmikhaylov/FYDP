import yaml
import openai

def load_api_key(config_file="config.yaml"):
    """
    Load the OpenAI API key from the YAML config file.
    
    Expected YAML structure:
    
    api_key:
      OPEN_AI: "your-api-key-here"
    """
    with open(config_file, "r") as file:
        config = yaml.safe_load(file)
        api_config = config.get("api_key", {})
        api_key = api_config.get("OPEN_AI")
        if not api_key:
            raise ValueError("OPEN_AI key not found in config file.")
        return api_key

# Load the API key and instantiate the client with it
api_key = load_api_key()
client = openai.OpenAI(api_key=api_key)

def transcribe_audio_file(audio_file):
    """
    Transcribe an audio file using the client-based approach.
    """
    try:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        return transcription
    except Exception as e:
        raise RuntimeError(f"Transcription failed: {e}")

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python speech_to_text.py <path_to_audio_file>")
        sys.exit(1)

    audio_file_path = sys.argv[1]
    try:
        with open(audio_file_path, "rb") as audio_file:
            result = transcribe_audio_file(audio_file)
            print("Transcription Result:")
            # Use the 'text' attribute instead of .get()
            print(result.text)
    except Exception as e:
        print(f"Error: {e}")
