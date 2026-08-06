# CV Extractor using LlamaParse

This project provides an automated solution to extract structured data from PDF CVs and Resumes using the [LlamaParse API](https://cloud.llamaindex.ai/parse). It leverages an Agentic extraction tier to parse even complex documents accurately into a predefined JSON schema.

## Features

- **Batch Processing**: Automatically finds and processes all `.pdf` files in the directory.
- **Agentic Extraction**: Uses LlamaParse's highest tier for complex documents and layouts.
- **Structured Output**: Extracted data is saved as `.json` with a consistent schema.
- **Confidence Scores & Citations**: By default, LlamaParse tracks citations and confidence metadata for the extracted fields.

## Requirements

- Python 3.7+
- `llama-cloud`
- `python-dotenv`

## Setup

1. **Install Dependencies**
   Open your terminal in the project root and run:
   ```bash
   pip install -r requirements.txt
   ```

2. **API Key Setup**
   The project uses a `.env` file to securely load your LlamaParse API key. 
   Open the `.env` file and insert your API key like so:
   ```env
   LLAMA_CLOUD_API_KEY=llx-your-api-key-here
   ```

## Usage

1. Place one or more `.pdf` files directly in the root directory.
2. Run the extraction script:
   ```bash
   python extract_cv.py
   ```
3. The script will iterate over every PDF file in the folder, upload them to LlamaParse, and poll for the completion of the job.

## Output

For each `[filename].pdf`, a new file named `[filename]_extracted.json` will be generated in the same directory. The JSON output strictly follows the schema defined in `extract_cv.py`.

### Schema Highlights

The resulting JSON includes the following structured properties:
- **`basics`**: Name, email, phone, location (city, region, country), profiles, and professional summary.
- **`skills`**: Skills categorized with keywords and proficiency levels.
- **`experience`**: Reverse chronological work history including company, position, dates, highlights, and technologies used.
- **`education`**: Academic history, institution names, degrees, and graduation dates.
- **`certifications`**: Certifications, issuer, and validity dates.
- **`publications`**: Publications with titles, publishers, dates, and URLs.

## Troubleshooting

- **`ValueError: LLAMA_CLOUD_API_KEY not found in environment variables.`**
  Ensure that you have properly saved your API key in the `.env` file without any extra quotes, and that the `.env` file is in the same directory as the script.
- **No PDF files found.**
  Make sure your CVs have a `.pdf` extension and are located in the root folder.
