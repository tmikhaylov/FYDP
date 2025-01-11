# bring in our LLAMA_CLOUD_API_KEY
from dotenv import load_dotenv
load_dotenv()

llama_parse_key = 'llx-tkohryjecs4zN3ZBR2ks8YPGcqbbDi8hVioywHpPOC60IS2h'
# bring in deps
from llama_parse import LlamaParse
from llama_index.core import SimpleDirectoryReader

# set up parser
parser = LlamaParse(
    api_key = llama_parse_key,
    result_type="markdown"  # "markdown" and "text" are available
)

# use SimpleDirectoryReader to parse our file
file_extractor = {".pdf": parser}
documents = SimpleDirectoryReader(input_files=['raw_data/Canada_Wildfire_Next-Day_Spread_Prediction_Tools_Using_Deep_Learning_-_Xiang_Fang.pdf'], 
                                  file_extractor=file_extractor).load_data()
print(documents)