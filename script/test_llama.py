import os
from pathlib import Path
from dotenv import load_dotenv
from llama_cloud import LlamaCloud

load_dotenv()

SCRIPT_DIR = Path(__file__).parent
FIXTURE_PDF = SCRIPT_DIR / "fixtures" / "two-column-resume-template-blue.pdf"
TEMP_DIR = SCRIPT_DIR.parent / "temp"

api_key = os.environ.get("LLAMA_CLOUD_API_KEY")
if not api_key:
    raise SystemExit("LLAMA_CLOUD_API_KEY environment variable is required.")

client = LlamaCloud(api_key=api_key)

print("Uploading CV to LlamaCloud for parsing...")
file_obj = client.files.create(file=str(FIXTURE_PDF), purpose="parse")

print(f"File uploaded successfully. File ID: {file_obj.id}")
print("Waiting for parsing to complete...")

try:
    result = client.parsing.parse(
        file_id=file_obj.id,
        expand=["markdown_full", "text_full"],
        tier="fast",
        version="latest"
    )

    print("\n[OK] Parsing completed successfully!")
    print(f"Result contains {len(result.markdown_full or '')} chars of markdown, {len(result.text_full or '')} chars of text")
    
    TEMP_DIR.mkdir(exist_ok=True)
    (TEMP_DIR / "output.md").write_text(result.markdown_full or "", encoding="utf-8")
    (TEMP_DIR / "output.txt").write_text(result.text_full or "", encoding="utf-8")
    
    print("\nPreview of parsed markdown:")
    print("-" * 50)
    print((result.markdown_full or "")[:500] + "...\n[TRUNCATED]")
    print("-" * 50)
    
except Exception as e:
    print(f"\n[ERROR] Error during parsing: {e}")
