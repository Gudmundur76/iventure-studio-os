import os
import pickle
import glob
from encoder import Encoder

# VIC-Zero Data Seeding Logic
DATA_DIRS = [
    "/llm-wiki/wiki/*.md",
    "/BiosimilarIntelCo/*.md",
    "/knowledge_graph/entities/*.yaml"
]

def load_text_from_drive():
    all_text = []
    for pattern in DATA_DIRS:
        # Note: In a real run, we would use gsk drive ls/download to pull these locally
        # For this seeding pass, we are creating the pipeline script.
        pass
    return "Sample training text from VIC knowledge base..."

def prepare():
    enc = Encoder()
    # In a real run, we would initialize/train the encoder on our specific vocab
    text = load_text_from_drive()
    tokens = enc.encode(text)
    
    dataset = {"dataset": [tokens]}
    output_path = "biotech_training.bin"
    with open(output_path, "wb") as f:
        pickle.dump(dataset, f)
    print(f"Dataset prepared at {output_path}")

if __name__ == "__main__":
    prepare()
