import os.path
import os
import sys
import argparse
from pathlib import Path
import yaml

from llama_index.multi_modal_llms.openai import OpenAIMultiModal
from llama_index.llms.openai import OpenAI
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, load_index_from_storage

def load_config(config_path="config.yaml"):
    with open(config_path, "r") as file:
        config = yaml.safe_load(file)  # Load YAML into a Python dict
    return config

def main():
    from dotenv import load_dotenv
    config = load_config()
    load_dotenv()

    llama_parse_key = config['api_key']['LLAMA_CLOUD']
    from llama_parse import LlamaParse

    parser = argparse.ArgumentParser(description="RAG Script for Document Parsing")
    parser.add_argument("--files", nargs="+", required=True, help="Paths to the Document Parsing")
    parser.add_argument("--query", type=str, required=True, help="User query")
    parser.add_argument("--project_name", type=str, required=False)

    args = parser.parse_args()
    

    llama_parser = LlamaParse(
        api_key = llama_parse_key,
        result_type="markdown"  # "markdown" and "text" are available
    )
    file_extractor = {".pdf": llama_parser}
    file_paths = args.files
    user_query = args.query
    project_dir = args.project_name
    os.environ["OPENAI_API_KEY"] =  config['api_key']['OPEN_AI']
    PERSIST_DIR = os.path.join("./storage", project_dir) if project_dir else "./storage"

    if not os.path.exists(PERSIST_DIR):
        documents = SimpleDirectoryReader(input_files=file_paths,
                                        file_extractor=file_extractor).load_data()
        index = VectorStoreIndex.from_documents(documents)
        index.storage_context.persist(persist_dir=PERSIST_DIR)
    else:
        storage_context = StorageContext.from_defaults(persist_dir = PERSIST_DIR)
        index = load_index_from_storage(storage_context)
        # print(file_paths)
        documents = SimpleDirectoryReader(input_files=file_paths,
                                        file_extractor=file_extractor).load_data()
        for d in documents:
            index.insert(d)
        
        
    # documents = SimpleDirectoryReader("data").load_data()
    # index = VectorStoreIndex.from_documents(documents)
    query_engine = index.as_query_engine()
    # print(f"\nPrompting... Your current prompt: {prompt}\n")
    response = query_engine.query(user_query)
    # response = query_engine.query("How is the algorithm proposed by the paper different from Locality-Sensitive-Hashing?")
    print(response)

if __name__ == "__main__":
    main()