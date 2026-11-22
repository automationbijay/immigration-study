import json
import logging
import time
from typing import Any, Dict, List
import httpx
from bs4 import BeautifulSoup
import re

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
def clean_text(text: str) -> str:
    if not text:
        return ""
    # Clean up zero-width spaces, special chars, and extra whitespace
    cleaned = text.replace("\u200b", "").replace("?<", "").strip()
    return cleaned


def extract_html_data(html_content: str) -> Dict[str, Any]:
    """
    Extracts text and URLs from an HTML snippet.
    Returns a dict with 'text' and 'urls' (list of links).
    """
    if not html_content or not isinstance(html_content, str):
        return {"text": "", "urls": []}

    soup = BeautifulSoup(html_content, "html.parser")

    # Extract text and replace specific HTML entities correctly
    raw_text = soup.get_text(separator=" ", strip=True)
    text = clean_text(raw_text.replace("&#58;", ":"))

    urls = []
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        # Filter out javascript links if needed, but sometimes they want all
        if href and not href.startswith("javascript:"):
            # Clean up the href
            href = href.replace("&#58;", ":")
            urls.append(href)

    return {"text": text, "urls": urls}


def main() -> List[Dict[str, Any]]:
    """
    Scrapes the Skill occupation list from the Australian Home Affairs website.
    """
    logging.info("Initiating scraping for Skilled Occupation List...")
    url = "https://immi.homeaffairs.gov.au/_layouts/15/api/Data.aspx/GetSkillOccupation"
    payload = {
        "webUrl": "/work-in-australia",
        "listname": "Occupations"
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
    }

    # 1. Network Retries
    max_retries = 3
    data = None
    for attempt in range(max_retries):
        try:
            logging.info(f"Making POST request to {url} (Attempt {attempt + 1}/{max_retries})")
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
            logging.info("Request successful. Parsing JSON response...")
            data = response.json()
            break
        except Exception as e:
            logging.warning(f"Request failed: {e}")
            if attempt < max_retries - 1:
                logging.info("Waiting 3 seconds before retrying...")
                time.sleep(3)
            else:
                logging.error("Max retries reached. Exiting.")
                return []

    if not data:
        return []

    # The API returns data wrapped in a "d" string/dict
    if "d" not in data:
        logging.warning("Unexpected JSON structure, no 'd' key found.")
        return []

    d_obj = data["d"]
    if isinstance(d_obj, str):
        d_obj = json.loads(d_obj)

    listings = d_obj.get("data", [])
    logging.info(f"Found {len(listings)} occupations. Cleaning and formatting data...")

    # 4. Pagination Warning
    if len(listings) in [100, 500, 1000]:
        logging.warning(f"Exact count of {len(listings)} found. The API might have introduced pagination!")

    cleaned_listings = []
    for index, item in enumerate(listings):
        # 2. Item-Level Error Isolation
        try:
            # Extract and clean textual components
            occupation = clean_text(item.get("occupation", ""))

            anzsco_data = extract_html_data(item.get("anzscocode", ""))
            visa_plain = clean_text(item.get("visas", ""))
            list_plain = clean_text(item.get("list", ""))
            assessauth_data = extract_html_data(item.get("assessauth", ""))

            # Parse the 'list' field into individual boolean columns
            raw_list_str = list_plain.replace(";", ",")
            list_values = [x.strip() for x in raw_list_str.split(",") if x.strip()]

            # Extract just the 6-digit ANZSCO code
            anzsco_text = anzsco_data["text"]
            code_match = re.search(r'\b\d{6}\b', anzsco_text)
            anzsco_code = code_match.group(0) if code_match else anzsco_text

            # 3. Safer Regex Fallbacks/Logging
            if not code_match and anzsco_text:
                logging.warning(f"Could not find 6-digit ANZSCO code in: '{anzsco_text}'. Using raw text.")

            # Custom parsing for assessing authority short names and URLs
            raw_auth_html = item.get("assessauth", "")
            auth_soup = BeautifulSoup(raw_auth_html, "html.parser")

            auth_names = []
            auth_urls = []
            for a in auth_soup.find_all("a"):
                href = a.get("href", "")
                if href.startswith("javascript:"):
                    auth_names.append(a.get_text(strip=True))
                elif href and not href.startswith("javascript:"):
                    auth_urls.append(href.replace("&#58;", ":"))

            # If javascript links found, use them. Otherwise fallback to raw cleaned text without URLs.
            if auth_names:
                auth_text = " ".join(auth_names)
            else:
                # Fallback: clean the text and strip out the URLs
                auth_text = clean_text(auth_soup.get_text(separator=" ", strip=True))
                for url in auth_urls:
                    auth_text = auth_text.replace(url, "").strip()

            # Join multiple URLs if present, otherwise single URL
            auth_url = ", ".join(auth_urls)

            # Clean up the raw_data object to avoid WINDMILL_TOO_BIG limit (1MB max for flow states)
            # The HTML properties take up ~800KB of redundant space.
            trimmed_raw = {k: v for k, v in item.items() if k not in ['assessauth', 'visacaveats', 'anzscocode']}

            # Skip occupations with no visas, as the official UI filters them out (714 total - 23 empty = 691 shown)
            if not visa_plain:
                continue

            cleaned_item = {
                "occupation": occupation,
                "anzsco_code": anzsco_code,
                "assessing_authority": auth_text,
                "assessing_authority_url": auth_url,
                "visa": visa_plain,

                # Boolean columns for the lists (merging RSMS ROL into list_rol)
                "list_rol": "ROL" in list_values or "RSMS ROL" in list_values,
                "list_stsol": "STSOL" in list_values,
                "list_csol": "CSOL" in list_values,
                "list_mltssl": "MLTSSL" in list_values,

                # Keep the raw data for jsonb storage but pruned of heavy HTML
                "raw_data": trimmed_raw
            }

            cleaned_listings.append(cleaned_item)
        except Exception as e:
            logging.error(f"Failed to parse item at index {index}. Error: {e}. Item: {item}")
            continue

        if index > 0 and index % 100 == 0:
            logging.info(f"Processed {index} records...")

    logging.info(f"Finished processing {len(cleaned_listings)} records successfully.")
    return cleaned_listings

if __name__ == "__main__":
    import pprint
    res = main()
    print("Sample output:")
    pprint.pprint(res[:2])
