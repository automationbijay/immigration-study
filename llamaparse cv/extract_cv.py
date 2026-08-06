import json
import time
import os
from pathlib import Path
from dotenv import load_dotenv
from llama_cloud import LlamaCloud

# Load environment variables from .env file
load_dotenv()

def extract_resume_data(file_path: str, output_path: str = "extracted.json"):
    """
    Extract structured data from a resume document using LlamaParse API.
    """
    api_key = os.getenv("LLAMA_CLOUD_API_KEY")
    if not api_key:
        raise ValueError("LLAMA_CLOUD_API_KEY not found in environment variables.")

    client = LlamaCloud(api_key=api_key)

    # Schema for CV extraction
    data_schema = {
        "type": "object",
        "properties": {
            "basics": {
                "type": "object",
                "properties": {
                    "name": {
                        "description": "The full name of the candidate",
                        "type": "string"
                    },
                    "email": {
                        "description": "The email address of the candidate",
                        "type": "string"
                    },
                    "phone": {
                        "description": "The phone number of the candidate in any standard format",
                        "anyOf": [{"type": "string"}, {"type": "null"}]
                    },
                    "location": {
                        "description": "The current location of the candidate",
                        "anyOf": [{
                            "type": "object",
                            "properties": {
                                "city": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                                "region": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                                "country": {"anyOf": [{"type": "string"}, {"type": "null"}]}
                            },
                            "required": ["city", "region", "country"],
                            "additionalProperties": False
                        }, {"type": "null"}]
                    },
                    "profiles": {
                        "description": "Professional social media profiles or personal websites",
                        "anyOf": [{
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "network": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                                    "url": {"anyOf": [{"type": "string"}, {"type": "null"}]}
                                },
                                "required": ["network", "url"],
                                "additionalProperties": False
                            }
                        }, {"type": "null"}]
                    },
                    "summary": {
                        "description": "Brief professional summary or objective statement",
                        "anyOf": [{"type": "string"}, {"type": "null"}]
                    }
                },
                "required": ["name", "email", "phone", "location", "profiles", "summary"],
                "additionalProperties": False
            },
            "skills": {
                "description": "Technical and professional skills grouped by category",
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                        "keywords": {
                            "anyOf": [{
                                "type": "array",
                                "items": {"type": "string"}
                            }, {"type": "null"}]
                        },
                        "level": {
                            "description": "Proficiency level in this skill category",
                            "type": "string",
                            "enum": ["beginner", "intermediate", "advanced", "expert"]
                        }
                    },
                    "required": ["category", "keywords", "level"],
                    "additionalProperties": False
                }
            },
            "experience": {
                "description": "Professional work experience in reverse chronological order",
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "company": {"type": "string"},
                        "position": {"type": "string"},
                        "startDate": {"type": "string"},
                        "endDate": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                        "highlights": {
                            "anyOf": [{
                                "type": "array",
                                "items": {"type": "string"}
                            }, {"type": "null"}]
                        },
                        "technologies": {
                            "anyOf": [{
                                "type": "array",
                                "items": {"type": "string"}
                            }, {"type": "null"}]
                        }
                    },
                    "required": ["company", "position", "startDate", "endDate", "highlights", "technologies"],
                    "additionalProperties": False
                }
            },
            "education": {
                "anyOf": [{
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "institution": {"type": "string"},
                            "degree": {"type": "string"},
                            "field": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                            "graduationDate": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                            "gpa": {"anyOf": [{"type": "number"}, {"type": "null"}]}
                        },
                        "required": ["institution", "degree", "field", "graduationDate", "gpa"],
                        "additionalProperties": False
                    }
                }, {"type": "null"}]
            },
            "certifications": {
                "anyOf": [{
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "issuer": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                            "date": {"type": "string"},
                            "validUntil": {"anyOf": [{"type": "string"}, {"type": "null"}]}
                        },
                        "required": ["name", "issuer", "date", "validUntil"],
                        "additionalProperties": False
                    }
                }, {"type": "null"}]
            },
            "publications": {
                "anyOf": [{
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                            "publisher": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                            "date": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                            "url": {"anyOf": [{"type": "string"}, {"type": "null"}]}
                        },
                        "required": ["title", "publisher", "date", "url"],
                        "additionalProperties": False
                    }
                }, {"type": "null"}]
            }
        },
        "required": ["basics", "skills", "experience", "education", "certifications", "publications"],
        "additionalProperties": False
    }

    print(f"Uploading {file_path} for extraction...")
    try:
        # Upload
        file_obj = client.files.create(file=file_path, purpose="extract")
        
        # Submit an extract job
        job = client.extract.create(
            file_input=file_obj.id,
            configuration={
                "data_schema": data_schema,
                "tier": "agentic",
                "extraction_target": "per_doc",
                "parse_tier": "agentic",
                "cite_sources": True,
                "confidence_scores": True
            },
        )

        print(f"Job submitted (ID: {job.id}). Polling for completion...")
        
        # Poll until the job reaches a terminal state
        while job.status not in ("COMPLETED", "FAILED", "CANCELLED"):
            time.sleep(2)
            job = client.extract.get(job.id)
            print(f"Current status: {job.status}")

        if job.status != "COMPLETED":
            raise RuntimeError(f"Extract job {job.id} ended in {job.status}: {job.error_message}")

        # Persist extracted JSON to disk
        output_file = Path(output_path)
        output_file.write_text(json.dumps(job.extract_result, indent=2))
        print(f"Extraction successful. Data saved to {output_path}")

        # Per-field citation / confidence metadata
        if job.extract_metadata and job.extract_metadata.field_metadata:
            print("\nMetadata (Confidence/Citations):")
            for field, meta in (job.extract_metadata.field_metadata.document_metadata or {}).items():
                print(f"{field}: {meta}")
                
        return job.extract_result

    except Exception as e:
        print(f"Error during extraction: {e}")
        return None

if __name__ == "__main__":
    pdf_files = list(Path(".").glob("*.pdf"))
    
    if not pdf_files:
        print("No PDF files found in the current directory.")
    else:
        for pdf_path in pdf_files:
            output_name = f"{pdf_path.stem}_extracted.json"
            print(f"\n--- Processing {pdf_path.name} ---")
            extract_resume_data(str(pdf_path), output_path=output_name)
        print("\nAll files processed.")
