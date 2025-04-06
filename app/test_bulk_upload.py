# test_bulk_upload.py
import requests
import csv
import io
import time

BASE_URL = "http://127.0.0.1:8080"
AUTH_HEADER = {"Authorization": "Bearer test-token"}

def test_server_up():
    print("Testing if server is up...")
    try:
        response = requests.get(f"{BASE_URL}/admin/dashboard", headers=AUTH_HEADER, timeout=5)
        print(f"Server status: {response.status_code}")
        if response.status_code == 200:
            print("Server is up and authentication bypass is working!")
            return True
        else:
            print(f"Server responded with: {response.text}")
            return False
    except Exception as e:
        print(f"Error connecting to server: {e}")
        return False

def create_csv_directly():
    print("\nCreating CSV file directly...")
    with open('test_grades.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['student_id', 'subject', 'grade'])
        writer.writerow(['1', 'Math', '95'])
        writer.writerow(['2', 'Science', '87']) 
        writer.writerow(['3', 'History', '78'])
    print("CSV file created at: test_grades.csv")

def upload_csv():
    print("\nUploading CSV file...")
    files = {'file': ('test_grades.csv', open('test_grades.csv', 'rb'), 'text/csv')}
    
    try:
        response = requests.post(
            f"{BASE_URL}/grades/upload", 
            headers=AUTH_HEADER,
            files=files,
            timeout=10
        )
        
        print(f"Upload status code: {response.status_code}")
        if response.status_code == 200:
            print("Upload successful!")
            print(f"Response: {response.json()}")
        else:
            print(f"Upload failed: {response.text}")
    except Exception as e:
        print(f"Error during upload: {e}")
    finally:
        files['file'][1].close()  # Close the file

def check_grades():
    print("\nChecking grades for students...")
    for student_id in [1, 2, 3]:
        try:
            response = requests.get(
                f"{BASE_URL}/grades/{student_id}", 
                headers=AUTH_HEADER,
                timeout=5
            )
            print(f"Student {student_id} grades status: {response.status_code}")
            if response.status_code == 200:
                print(f"Student {student_id} grades: {response.json()}")
            else:
                print(f"Failed to get grades: {response.text}")
        except Exception as e:
            print(f"Error checking grades: {e}")

if __name__ == "__main__":
    if test_server_up():
        print("\nStarting test sequence...")
        create_csv_directly()
        time.sleep(1)  # Small delay between operations
        upload_csv()
        time.sleep(1)  # Small delay between operations
        check_grades()
    else:
        print("\nServer not responding properly. Make sure your FastAPI server is running with TEST_MODE=1")