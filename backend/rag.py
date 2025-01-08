import os.path
import sys

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, load_index_from_storage

prompt = sys.argv[1]
os.environ["OPENAI_API_KEY"] = 'ask alex for the key'
PERSIST_DIR= "./storage"
if not os.path.exists(PERSIST_DIR):
    documents = SimpleDirectoryReader("data").load_data()
    index = VectorStoreIndex.from_documents(documents)
    index.storage_context.persist(persist_dir=PERSIST_DIR)
else:
    storage_context = StorageContext.from_defaults(persist_dir = PERSIST_DIR)
    index = load_index_from_storage(storage_context)
# documents = SimpleDirectoryReader("data").load_data()
# index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
# print(f"\nPrompting... Your current prompt: {prompt}\n")
response = query_engine.query(prompt)
# response = query_engine.query("How is the algorithm proposed by the paper different from Locality-Sensitive-Hashing?")
print(response)

