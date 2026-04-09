import requests

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    response = requests.get(f"{BASE_URL}/")
    assert response.status_code == 200
    print("Health check passed!")

def test_upload_mock():
    # This requires the server running
    try:
        url = f"{BASE_URL}/scans/upload/?patient_id=1&scan_type=ortho"
        files = {'file': ('test.jpg', b'fake-image-data', 'image/jpeg')}
        response = requests.post(url, files=files)
        print(f"Upload test: {response.status_code}, {response.json()}")
    except Exception as e:
        print(f"Upload test failed (server likely offline): {e}")

if __name__ == "__main__":
    test_health()
    test_upload_mock()
