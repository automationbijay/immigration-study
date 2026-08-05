from pathlib import Path
from llama_cloud import LlamaCloud

client = LlamaCloud(api_key="llx-WrFAtU3il9s9posD2MrphdkQEY9UJMYDkOzfg72KJWaTgFz3")

print("Uploading CV to LlamaCloud for parsing...")
file_obj = client.files.create(file="./two-column-resume-template-blue.pdf", purpose="parse")

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
    
    Path("output.md").write_text(result.markdown_full or "", encoding="utf-8")
    Path("output.txt").write_text(result.text_full or "", encoding="utf-8")
    
    print("\nPreview of parsed markdown:")
    print("-" * 50)
    print((result.markdown_full or "")[:500] + "...\n[TRUNCATED]")
    print("-" * 50)
    
except Exception as e:
    print(f"\n[ERROR] Error during parsing: {e}")
