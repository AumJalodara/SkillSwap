import httpx
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_test():
    with httpx.Client() as client:
        print("1. Registering Alice")
        alice_data = {"email": "alice5@example.com", "password": "password123", "name": "Alice"}
        r = client.post(f"{BASE_URL}/auth/register", json=alice_data)
        
        print("1b. Login Alice")
        r = client.post(f"{BASE_URL}/auth/login", data={"username": "alice5@example.com", "password": "password123"})
        if r.status_code != 200:
            print("Alice login failed:", r.status_code, r.text)
            return
        alice_token = r.json()["access_token"]
        alice_headers = {"Authorization": f"Bearer {alice_token}"}
        
        print("2. Registering Bob")
        bob_data = {"email": "bob5@example.com", "password": "password123", "name": "Bob"}
        r = client.post(f"{BASE_URL}/auth/register", json=bob_data)
        
        print("2b. Login Bob")
        r = client.post(f"{BASE_URL}/auth/login", data={"username": "bob5@example.com", "password": "password123"})
        bob_token = r.json()["access_token"]
        bob_headers = {"Authorization": f"Bearer {bob_token}"}
        
        print("3. Getting Alice ID")
        r = client.get(f"{BASE_URL}/auth/me", headers=alice_headers)
        alice_id = r.json()["id"]
        
        print("4. Getting Bob ID")
        r = client.get(f"{BASE_URL}/auth/me", headers=bob_headers)
        bob_id = r.json()["id"]

        print("5. Adding Skills for Alice (Teach Python, Learn React)")
        r = client.post(f"{BASE_URL}/skills/", headers=alice_headers, json={"name": "Python", "category": "Programming"})
        python_id = r.json().get("id") if r.status_code == 201 or r.status_code == 200 else None
        
        r = client.post(f"{BASE_URL}/skills/", headers=alice_headers, json={"name": "React", "category": "Programming"})
        react_id = r.json().get("id") if r.status_code == 201 or r.status_code == 200 else None
        
        if not python_id or not react_id:
            r = client.get(f"{BASE_URL}/skills/")
            for s in r.json():
                if s["name"] == "Python": python_id = s["id"]
                if s["name"] == "React": react_id = s["id"]
                
        r = client.post(f"{BASE_URL}/skills/user", headers=alice_headers, json={"skill_id": python_id, "is_teaching": True, "proficiency_level": "Expert"})
        r = client.post(f"{BASE_URL}/skills/user", headers=alice_headers, json={"skill_id": react_id, "is_teaching": False, "proficiency_level": "Beginner"})
        
        print("6. Adding Skills for Bob (Teach React, Learn Python)")
        r = client.post(f"{BASE_URL}/skills/user", headers=bob_headers, json={"skill_id": react_id, "is_teaching": True, "proficiency_level": "Expert"})
        r = client.post(f"{BASE_URL}/skills/user", headers=bob_headers, json={"skill_id": python_id, "is_teaching": False, "proficiency_level": "Beginner"})
        
        print("7. Bob sends Match Request to Alice")
        r = client.post(f"{BASE_URL}/matches/{alice_id}/request", headers=bob_headers)
        print("Match request:", r.status_code, r.text)
        match_id = r.json().get("id")
        
        print("8. Alice accepts Match Request")
        r = client.patch(f"{BASE_URL}/matches/{match_id}/accept", headers=alice_headers)
        print("Match accept:", r.status_code, r.text)
        
        print("9. Alice requests Session with Bob teaching React")
        session_data = {
            "match_id": match_id,
            "teacher_id": bob_id,
            "learner_id": alice_id,
            "skill_id": react_id,
            "duration_minutes": 60,
            "scheduled_at": "2026-10-10T10:00:00Z"
        }
        r = client.post(f"{BASE_URL}/sessions/", headers=alice_headers, json=session_data)
        print("Session request:", r.status_code, r.text)
        session_id = r.json().get("id")
        
        print("10. Bob accepts Session")
        r = client.patch(f"{BASE_URL}/sessions/{session_id}/accept", headers=bob_headers)
        print("Session accept:", r.status_code, r.text)
        
        print("11. Bob schedules Session")
        r = client.patch(f"{BASE_URL}/sessions/{session_id}/schedule", headers=bob_headers, json={"scheduled_at": "2026-10-10T10:00:00Z"})
        print("Session schedule:", r.status_code, r.text)
        
        print("12. Bob completes Session")
        r = client.patch(f"{BASE_URL}/sessions/{session_id}/complete", headers=bob_headers)
        print("Session complete:", r.status_code, r.text)
        
        print("13. Check Credits")
        r_alice = client.get(f"{BASE_URL}/credits/balance", headers=alice_headers)
        r_bob = client.get(f"{BASE_URL}/credits/balance", headers=bob_headers)
        print("Alice credits:", r_alice.json())
        print("Bob credits:", r_bob.json())

if __name__ == '__main__':
    run_test()
