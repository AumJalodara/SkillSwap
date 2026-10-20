import httpx
import uuid
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def get_client_and_base():
    try:
        r = httpx.get("http://127.0.0.1:8000/docs", timeout=1.0)
        if r.status_code == 200:
            print("Connected to live server at http://127.0.0.1:8000")
            return httpx.Client(timeout=10.0), "http://127.0.0.1:8000/api/v1"
    except Exception:
        pass
    
    print("Live server not running; using in-process TestClient.")
    from app.main import app
    from app.core.database import Base, engine
    from fastapi.testclient import TestClient
    Base.metadata.create_all(bind=engine)
    return TestClient(app), "/api/v1"

def run_test():
    uid = str(uuid.uuid4())[:8]
    alice_email = f"alice_{uid}@example.com"
    bob_email = f"bob_{uid}@example.com"
    password = "password123"

    client, BASE_URL = get_client_and_base()

    with client:
        print(f"=== Starting E2E Verification ({uid}) ===")

        # 1. Register Alice
        print("1. Registering Alice...")
        r = client.post(f"{BASE_URL}/auth/register", json={"email": alice_email, "password": password, "name": "Alice"})
        assert r.status_code == 201, f"Alice registration failed: {r.status_code} {r.text}"
        alice_id = r.json()["id"]

        # 1b. Login Alice
        r = client.post(f"{BASE_URL}/auth/login", data={"username": alice_email, "password": password})
        assert r.status_code == 200, f"Alice login failed: {r.status_code} {r.text}"
        alice_token = r.json()["access_token"]
        alice_headers = {"Authorization": f"Bearer {alice_token}"}

        # Verify Alice Initial Credits (Signup Bonus = 2)
        r = client.get(f"{BASE_URL}/credits/balance", headers=alice_headers)
        assert r.status_code == 200, f"Alice balance check failed: {r.status_code}"
        assert r.json()["balance"] == 2, f"Expected 2 signup credits, got {r.json()['balance']}"
        print(f"   Alice registered and received {r.json()['balance']} initial credits.")

        # 2. Register Bob
        print("2. Registering Bob...")
        r = client.post(f"{BASE_URL}/auth/register", json={"email": bob_email, "password": password, "name": "Bob"})
        assert r.status_code == 201, f"Bob registration failed: {r.status_code} {r.text}"
        bob_id = r.json()["id"]

        # 2b. Login Bob
        r = client.post(f"{BASE_URL}/auth/login", data={"username": bob_email, "password": password})
        assert r.status_code == 200, f"Bob login failed: {r.status_code} {r.text}"
        bob_token = r.json()["access_token"]
        bob_headers = {"Authorization": f"Bearer {bob_token}"}

        # Verify Bob Initial Credits
        r = client.get(f"{BASE_URL}/credits/balance", headers=bob_headers)
        assert r.status_code == 200
        assert r.json()["balance"] == 2
        print(f"   Bob registered and received {r.json()['balance']} initial credits.")

        # 3. Create or Fetch Skills
        print("3. Managing Skills...")
        r_py = client.post(f"{BASE_URL}/skills/", headers=alice_headers, json={"name": f"Python_{uid}", "category": "Programming"})
        assert r_py.status_code in [200, 201]
        python_id = r_py.json()["id"]

        r_react = client.post(f"{BASE_URL}/skills/", headers=alice_headers, json={"name": f"React_{uid}", "category": "Programming"})
        assert r_react.status_code in [200, 201]
        react_id = r_react.json()["id"]

        # Alice: Teach Python, Learn React
        r = client.post(f"{BASE_URL}/skills/me", headers=alice_headers, json={"skill_id": python_id, "type": "TEACH", "proficiency": 5})
        assert r.status_code in [200, 201], f"Failed to add Alice teaching skill: {r.status_code} {r.text}"
        r = client.post(f"{BASE_URL}/skills/me", headers=alice_headers, json={"skill_id": react_id, "type": "LEARN"})
        assert r.status_code in [200, 201], f"Failed to add Alice learning skill: {r.status_code} {r.text}"

        # Bob: Teach React, Learn Python
        r = client.post(f"{BASE_URL}/skills/me", headers=bob_headers, json={"skill_id": react_id, "type": "TEACH", "proficiency": 4})
        assert r.status_code in [200, 201], f"Failed to add Bob teaching skill: {r.status_code} {r.text}"
        r = client.post(f"{BASE_URL}/skills/me", headers=bob_headers, json={"skill_id": python_id, "type": "LEARN"})
        assert r.status_code in [200, 201], f"Failed to add Bob learning skill: {r.status_code} {r.text}"
        print("   Skills successfully added for both users.")

        # 4. Bob sends Match Request to Alice
        print("4. Bob requests match with Alice...")
        r = client.post(f"{BASE_URL}/matches/{alice_id}/request", headers=bob_headers)
        assert r.status_code == 200, f"Match request failed: {r.status_code} {r.text}"
        match_id = r.json()["id"]
        assert r.json()["status"] == "PENDING"

        # Check Alice received notification
        r_notif = client.get(f"{BASE_URL}/notifications/", headers=alice_headers)
        assert r_notif.status_code == 200
        alice_notifs = r_notif.json()
        assert any(n["type"] == "MATCH" and "sent you a match request" in n["message"] for n in alice_notifs)
        print("   Alice received match request notification.")

        # 5. Alice accepts Match Request
        print("5. Alice accepts match request...")
        r = client.patch(f"{BASE_URL}/matches/{match_id}/accept", headers=alice_headers)
        assert r.status_code == 200, f"Match accept failed: {r.status_code} {r.text}"
        assert r.json()["status"] == "ACCEPTED"

        # Check Bob received accepted notification
        r_notif = client.get(f"{BASE_URL}/notifications/", headers=bob_headers)
        assert r_notif.status_code == 200
        assert any(n["type"] == "MATCH" and "accepted your match request" in n["message"] for n in r_notif.json())
        print("   Bob received match accepted notification.")

        # 6. Alice requests Session with Bob teaching React
        print("6. Alice requests session with Bob teaching React...")
        session_data = {
            "match_id": match_id,
            "teacher_id": bob_id,
            "learner_id": alice_id,
            "skill_id": react_id,
            "duration_minutes": 60,
            "scheduled_at": "2026-10-25T14:00:00Z"
        }
        r = client.post(f"{BASE_URL}/sessions/", headers=alice_headers, json=session_data)
        assert r.status_code == 201, f"Session request failed: {r.status_code} {r.text}"
        session_id = r.json()["id"]
        assert r.json()["status"] == "REQUESTED"

        # 7. Bob accepts Session
        print("7. Bob accepts session...")
        r = client.patch(f"{BASE_URL}/sessions/{session_id}/accept", headers=bob_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "ACCEPTED"

        # 8. Bob schedules Session
        print("8. Bob schedules session with video link...")
        r = client.patch(f"{BASE_URL}/sessions/{session_id}/schedule", headers=bob_headers, json={
            "scheduled_at": "2026-10-25T14:00:00Z",
            "meeting_link": "https://meet.skillswap.com/react-session-1"
        })
        assert r.status_code == 200
        assert r.json()["status"] == "SCHEDULED"
        assert r.json()["meeting_link"] == "https://meet.skillswap.com/react-session-1"

        # 9. Bob completes Session (Credit transfer: Alice -1, Bob +1)
        print("9. Bob completes session...")
        r = client.patch(f"{BASE_URL}/sessions/{session_id}/complete", headers=bob_headers)
        assert r.status_code == 200, f"Session completion failed: {r.status_code} {r.text}"
        assert r.json()["status"] == "COMPLETED"

        # 10. Verify Balances and Ledgers
        print("10. Verifying credit ledger...")
        r_alice = client.get(f"{BASE_URL}/credits/balance", headers=alice_headers)
        r_bob = client.get(f"{BASE_URL}/credits/balance", headers=bob_headers)
        assert r_alice.json()["balance"] == 1, f"Expected Alice balance 1, got {r_alice.json()['balance']}"
        assert r_bob.json()["balance"] == 3, f"Expected Bob balance 3, got {r_bob.json()['balance']}"
        print(f"   Credit balances verified: Alice={r_alice.json()['balance']}, Bob={r_bob.json()['balance']}.")

        # 11. Alice rates the completed session
        print("11. Alice rates Bob...")
        r = client.post(f"{BASE_URL}/ratings/", headers=alice_headers, json={
            "session_id": session_id,
            "reviewee_id": bob_id,
            "rating": 5,
            "review": "Bob was a fantastic mentor for React!"
        })
        assert r.status_code == 201, f"Rating failed: {r.status_code} {r.text}"
        assert r.json()["rating"] == 5

        # Bob checks his ratings
        r_ratings = client.get(f"{BASE_URL}/ratings/me", headers=bob_headers)
        assert r_ratings.status_code == 200
        assert len(r_ratings.json()) >= 1
        assert any(rating["review"] == "Bob was a fantastic mentor for React!" for rating in r_ratings.json())
        print("   Rating verified on Bob's profile.")

        # 12. Test Skill Deletion
        print("12. Testing user skill deletion...")
        r_my_skills = client.get(f"{BASE_URL}/skills/me", headers=alice_headers)
        alice_skills = r_my_skills.json()
        target_us = next(s for s in alice_skills if s["skill_id"] == react_id)
        r_del = client.delete(f"{BASE_URL}/skills/me/{target_us['id']}", headers=alice_headers)
        assert r_del.status_code == 200
        
        # Verify deletion
        r_my_skills_after = client.get(f"{BASE_URL}/skills/me", headers=alice_headers)
        assert not any(s["skill_id"] == react_id for s in r_my_skills_after.json())
        print("   Skill deletion verified.")

        # 13. Test Profile Update
        print("13. Testing profile update...")
        r_prof = client.patch(f"{BASE_URL}/users/me", headers=alice_headers, json={
            "name": "Alice Super",
            "bio": "Experienced Python developer.",
            "experience_level": "Expert",
            "availability": "Weekday evenings"
        })
        assert r_prof.status_code == 200
        assert r_prof.json()["name"] == "Alice Super"
        assert r_prof.json()["experience_level"] == "Expert"
        print("   Profile update verified.")

        print("=== ALL E2E FLOWS PASSED SUCCESSFULLY ===")

if __name__ == '__main__':
    try:
        run_test()
    except Exception as e:
        print(f"E2E Test Failed: {e}")
        sys.exit(1)
