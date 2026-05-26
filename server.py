import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from nlp_engine import FAQMatcher

# Global FAQ Matcher instance
MATCHER = None
FAQS = []

def init_nlp():
    global MATCHER, FAQS
    faq_path = os.path.join(os.path.dirname(__file__), "faq_data.json")
    try:
        with open(faq_path, "r", encoding="utf-8") as f:
            FAQS = json.load(f)
        MATCHER = FAQMatcher(FAQS)
        print(f"NLP Engine successfully initialized with {len(FAQS)} FAQs.")
    except Exception as e:
        print(f"Error loading FAQ database: {e}")
        FAQS = []
        MATCHER = FAQMatcher([])

class FAQRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Override to suppress standard HTTP logging and keep stdout clean
        pass

    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == "/api/faqs":
            self.send_json(FAQS)
            return

        if path == "/" or path == "":
            file_path = "index.html"
        else:
            file_path = path.lstrip("/")

        public_dir = os.path.join(os.path.dirname(__file__), "public")
        full_path = os.path.join(public_dir, file_path)

        try:
            resolved_path = os.path.realpath(full_path)
            resolved_public_dir = os.path.realpath(public_dir)
            if not resolved_path.startswith(resolved_public_dir):
                self.send_error(403, "Access Forbidden")
                return
        except Exception:
            self.send_error(400, "Bad Request")
            return

        if os.path.exists(resolved_path) and os.path.isfile(resolved_path):
            _, ext = os.path.splitext(resolved_path)
            mime_types = {
                ".html": "text/html; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".ico": "image/x-icon",
            }
            content_type = mime_types.get(ext.lower(), "application/octet-stream")

            try:
                with open(resolved_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"Internal Server Error: {e}")
        else:
            self.send_error(404, "File Not Found")

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path == "/api/chat":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            
            try:
                body = json.loads(post_data.decode("utf-8"))
                user_message = body.get("message", "").strip()
            except Exception:
                self.send_json({"error": "Invalid JSON body"}, 400)
                return

            if not user_message:
                self.send_json({"error": "Message parameter is required"}, 400)
                return

            match_result = MATCHER.match(user_message)
            matched_faq = match_result["matched_faq"]
            score = match_result["score"]
            suggestions = match_result["suggestions"]

            response = {}
            HIGH_CONFIDENCE_THRESHOLD = 0.28
            MEDIUM_CONFIDENCE_THRESHOLD = 0.12

            if matched_faq and score >= HIGH_CONFIDENCE_THRESHOLD:
                response = {
                    "reply": matched_faq["answer"],
                    "matched_question": matched_faq["question"],
                    "category": matched_faq["category"],
                    "score": score,
                    "confidence": "high",
                    "suggestions": suggestions
                }
            elif matched_faq and score >= MEDIUM_CONFIDENCE_THRESHOLD:
                response = {
                    "reply": f"I think you might be asking about: **\"{matched_faq['question']}\"**\n\n{matched_faq['answer']}\n\n*Was this what you were looking for? If not, feel free to rephrase or check the suggested questions below.*",
                    "matched_question": matched_faq["question"],
                    "category": matched_faq["category"],
                    "score": score,
                    "confidence": "medium",
                    "suggestions": suggestions
                }
            else:
                fallback_reply = (
                    "I'm sorry, I couldn't find a direct answer in our FAQ knowledge base for that query. "
                    "Would you mind rephrasing your question?\n\n"
                    "Alternatively, here are some popular topics that might be related to what you're looking for:"
                )
                response = {
                    "reply": fallback_reply,
                    "matched_question": None,
                    "category": None,
                    "score": score,
                    "confidence": "low",
                    "suggestions": suggestions[:3]
                }

            self.send_json(response)
        else:
            self.send_json({"error": "Not Found"}, 404)

import sys

def run(port=8000):
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    init_nlp()
    public_dir = os.path.join(os.path.dirname(__file__), "public")
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
        print(f"Created public assets directory at {public_dir}")

    server_address = ("", port)
    httpd = HTTPServer(server_address, FAQRequestHandler)
    print(f"\n==================================================")
    print(f"[*] AetherAI FAQ Chatbot Server running successfully!")
    print(f"[*] Local Access URL: http://localhost:{port}")
    print(f"==================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
