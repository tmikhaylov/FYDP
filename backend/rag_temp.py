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

from llama_index.core.storage.chat_store import SimpleChatStore
from llama_index.core.memory import ChatMemoryBuffer

def load_config(config_path="config.yaml"):
    with open(config_path, "r") as file:
        config = yaml.safe_load(file)
    return config

def main():
    from dotenv import load_dotenv
    load_dotenv()
    config = load_config()

    parser = argparse.ArgumentParser(description="RAG Script for Document Parsing with Conversation Support")
    # --files is now optional
    parser.add_argument("--file", nargs="+", required=False, help="Paths to documents (optional)")
    parser.add_argument("--query", type=str, required=True, help="User query")
    parser.add_argument("--project_id", type=str, required=True, help="Project name for storage")
    parser.add_argument("--vector_store", type=str, default="local", 
                        help="Vector store to use (e.g., local, chroma, faiss, pinecone)")
    parser.add_argument("--llm", type=str, default="openai", 
                        help="LLM to use (e.g., openai, cohere)")
    parser.add_argument("--chat", action="store_true", help="Enable chat mode with conversation memory")
    
    args = parser.parse_args()

    # Instantiate the chosen LLM.
    if args.llm.lower() == "openai":
        from llama_index.llms.openai import OpenAI
        os.environ["OPENAI_API_KEY"] =  config['api_key']['OPEN_AI']
        llm_instance = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    elif args.llm.lower() == "cohere":
        from llama_index.llms.cohere import Cohere
        llm_instance = Cohere(api_key=os.environ.get("COHERE_API_KEY"))
    else:
        print(f"LLM '{args.llm}' not supported.")
        sys.exit(1)

    # Instantiate the chosen vector store.
    vs_choice = args.vector_store.lower()
    if vs_choice == "chroma":
        from llama_index.vector_stores.chroma import ChromaVectorStore
        vector_store_instance = ChromaVectorStore(collection_name="my_collection")
    elif vs_choice == "local":
        vector_store_instance = None
    else:
        print(f"Vector store '{args.vector_store}' not supported.")
        sys.exit(1)

    # Set up file extractor if needed; here we assume None for PDFs.
    llama_parse_key = config['api_key']['LLAMA_CLOUD']
    from llama_parse import LlamaParse
    llama_parser = LlamaParse(
        api_key = llama_parse_key,
        result_type="markdown"  # "markdown" and "text" are available
    )
    file_extractor = {".pdf": llama_parser}
    project_dir = args.project_id
    PERSIST_DIR = os.path.join("./storage", project_dir)

    # If the project index does not exist, create a new index.
    if not os.path.exists(PERSIST_DIR):
        if args.file:
            documents = SimpleDirectoryReader(
                input_files=args.file,
                file_extractor=file_extractor,
                filename_as_id=True
            ).load_data()
        else:
            documents = []
        index = VectorStoreIndex.from_documents(
            documents,
            llm=llm_instance,
            vector_store=vector_store_instance
        )
        index.storage_context.persist(persist_dir=PERSIST_DIR)
    else:
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
        index = load_index_from_storage(storage_context)
        # If a new file is provided, insert its contents.
        if args.file:
            documents = SimpleDirectoryReader(
                input_files=args.file,
                file_extractor=file_extractor,
                filename_as_id=True
            ).load_data()
            for d in documents:
                index.insert(d)
            index.storage_context.persist(persist_dir=PERSIST_DIR)

    # If chat mode is enabled, set up chat memory.
    if args.chat:
        # Define a separate persist path for chat memory
        chat_store_path = os.path.join(PERSIST_DIR, "chat_store.json")
        if os.path.exists(chat_store_path):
            chat_store = SimpleChatStore.from_persist_path(persist_path=chat_store_path)
        else:
            chat_store = SimpleChatStore()
        # Create a ChatMemoryBuffer using the chat store.
        # Here we use "user1" as a unique key; you could parameterize this if needed.
        chat_memory = ChatMemoryBuffer.from_defaults(
            token_limit=3000,
            chat_store=chat_store,
            chat_store_key="user1"
        )
        # Pass the memory to the chat engine.
        chat_engine = index.as_chat_engine(memory=chat_memory, llm=llm_instance)
        response = chat_engine.chat(args.query)
        # Persist the updated chat store for future sessions.
        chat_store.persist(persist_path=chat_store_path)
    else:
        query_engine = index.as_query_engine()
        response = query_engine.query(args.query)

    print(response)

if __name__ == "__main__":
    main()