import sys
import time
import urllib.request
import json
import threading

sys.path.insert(0, r'c:\Users\AL-Motahida\Documents\antigravity\charming-darwin\electrical_sld_studio')
from app import app, start_server

test_port = 7899
t = threading.Thread(target=lambda: start_server(test_port), daemon=True)
t.start()
time.sleep(1)

base_url = f"http://127.0.0.1:{test_port}"

# 1. Test GET /
req = urllib.request.urlopen(base_url + "/")
assert req.status == 200, "GET / failed"
html = req.read().decode('utf-8')
assert "Smart Grid SLD Studio" in html, "Title missing in HTML"
assert "ENG-MOSTAFAELMGHRABY" in html, "Copyright missing in HTML"
print("HTTP GET /: SUCCESS (HTML contains correct title and copyright)")

# 2. Test GET /api/users
req = urllib.request.urlopen(base_url + "/api/users")
data = json.loads(req.read().decode('utf-8'))
assert data["success"] is True
assert len(data["users"]) == 4
print("HTTP GET /api/users: SUCCESS (4 users returned)")

# 3. Test POST /api/login
login_data = json.dumps({"user_id": "admin", "password": "123450"}).encode('utf-8')
req = urllib.request.Request(base_url + "/api/login", data=login_data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode('utf-8'))
assert data["success"] is True
assert "token" in data
print("HTTP POST /api/login: SUCCESS (admin with 123450 authenticated)")

print("\nALL HTTP ENDPOINTS VERIFIED AND RESPONDING PERFECTLY!")
