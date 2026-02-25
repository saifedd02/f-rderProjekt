import re
import urllib.request
import urllib.error
import concurrent.futures
import socket

def extract_urls(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Regex to find 'url': '...'
    urls = re.findall(r"url:\s*['\"](https?://[^'\"]+)['\"]", content)
    return urls

def check_url(url):
    try:
        # User-Agent is often required to avoid 403s from some servers
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        )
        # Timeout set to 5 seconds
        with urllib.request.urlopen(req, timeout=5) as response:
            return url, response.getcode()
    except urllib.error.HTTPError as e:
        return url, e.code
    except urllib.error.URLError as e:
        return url, str(e.reason)
    except socket.timeout:
        return url, "Timeout"
    except Exception as e:
        return url, str(e)

def main():
    file_path = '/Users/sif-eddinekhayati/Downloads/f-rderProjekt-main/script.js'
    print(f"Extracting URLs from {file_path}...")
    urls = extract_urls(file_path)
    print(f"Found {len(urls)} URLs. Checking status...")

    broken_links = []
    
    # Use ThreadPoolExecutor for concurrent checking
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(check_url, url): url for url in urls}
        for future in concurrent.futures.as_completed(future_to_url):
            url, status = future.result()
            if isinstance(status, int) and status >= 400:
                print(f"[BROKEN {status}] {url}")
                broken_links.append((url, status))
            elif isinstance(status, str): # Error message
                print(f"[ERROR] {url} - {status}")
                broken_links.append((url, status))
            else:
                print(f"[OK] {url}")

    print(f"\nSummary: {len(broken_links)} broken links found out of {len(urls)}.")

if __name__ == "__main__":
    main()
