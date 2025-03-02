import os
import sys
import argparse
import yaml
from pathlib import Path

from llama_index.core import (
    VectorStoreIndex, 
    SimpleDirectoryReader, 
    StorageContext, 
    load_index_from_storage
)

def load_config(config_path="config.yaml"):
    with open(config_path, "r") as file:
        config = yaml.safe_load(file)
    return config

def main():
    from dotenv import load_dotenv
    load_dotenv()
    config = load_config()

    parser = argparse.ArgumentParser(description="RAG Script for Document Parsing")
    parser.add_argument("--files", nargs="+", required=True, help="Paths to the documents")
    parser.add_argument("--query", type=str, required=True, help="User query")
    parser.add_argument("--project_name", type=str, required=False, help="Project name for storage")
    # New arguments for vector store and LLM; default vector store is now "local"
    parser.add_argument("--vector_store", type=str, default="local", 
                        help="Vector store to use (e.g., local, chroma, faiss, pinecone)")
    parser.add_argument("--llm", type=str, default="openai", 
                        help="LLM to use (e.g., openai, cohere)")

    args = parser.parse_args()

    # Instantiate the chosen LLM
    if args.llm.lower() == "openai":
        from llama_index.llms.openai import OpenAI
        # llm_instance = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        os.environ["OPENAI_API_KEY"] =  config['api_key']['OPEN_AI']
        llm_instance = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    elif args.llm.lower() == "cohere":
        from llama_index.llms.cohere import Cohere
        llm_instance = Cohere(api_key=os.environ.get("COHERE_API_KEY"))
    else:
        print(f"LLM '{args.llm}' not supported.")
        sys.exit(1)

    # Instantiate the chosen vector store
    vs_choice = args.vector_store.lower()
    if vs_choice == "chroma":
        from llama_index.vector_stores.chroma import ChromaVectorStore
        vector_store_instance = ChromaVectorStore(collection_name="my_collection")
    # elif vs_choice == "faiss":
    #     from llama_index.vector_stores.faiss import FaissVectorStore
    #     vector_store_instance = FaissVectorStore()
    # elif vs_choice == "pinecone":
    #     from llama_index.vector_stores.pinecone import PineconeVectorStore
    #     vector_store_instance = PineconeVectorStore(index_name="my_index")
    elif vs_choice == "local":
        vector_store_instance = None
    else:
        print(f"Vector store '{args.vector_store}' not supported.")
        sys.exit(1)

    # In this example, file_extractor can be extended as needed.
    # If you have a specialized extractor (like LlamaParse), instantiate it here.

    file_paths = args.files
    user_query = args.query
    project_dir = args.project_name
    PERSIST_DIR = os.path.join("./storage", project_dir) if project_dir else "./storage"

    llama_parse_key = config['api_key']['LLAMA_CLOUD']
    from llama_parse import LlamaParse
    llama_parser = LlamaParse(
        api_key = llama_parse_key,
        result_type="markdown"  # "markdown" and "text" are available
    )
    file_extractor = {".pdf": llama_parser}
    # If this is a new project, create an index from the documents.
    if not os.path.exists(PERSIST_DIR):
        documents = SimpleDirectoryReader(
            input_files=file_paths,
            file_extractor=file_extractor,
            filename_as_id=True  # Unique file name becomes the document ID.
        ).load_data()
        index = VectorStoreIndex.from_documents(
            documents,
            llm=llm_instance,
            vector_store=vector_store_instance
        )
        index.storage_context.persist(persist_dir=PERSIST_DIR)
    else:
        # Otherwise, load the existing index and insert any new documents.
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
        index = load_index_from_storage(storage_context)
        if file_paths:
            documents = SimpleDirectoryReader(
                input_files=file_paths,
                file_extractor=file_extractor,
                filename_as_id=True
            ).load_data()
            for d in documents:
                index.insert(d)
            index.storage_context.persist(persist_dir=PERSIST_DIR)

    query_engine = index.as_query_engine()
    response = query_engine.query(user_query)
    print(response)

if __name__ == "__main__":
    main()
