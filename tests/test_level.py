import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# manually hardcoding the path since pytest can't find the fucking root repo

"""BOO THANG THE TESTS ONLY WORK IF THE DB IS ALREADY LOADED"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app) # test app instance

"""hardcoded test values, feel free to switch up"""

def test_get_levels_for_user():
    user_id = 1  # assumes user 1 exists in seeded DB

    response = client.get(f"/level/user/{user_id}")
    assert response.status_code == 200 # successful

    data = response.json()

    # checking that the response is in a list
    # and all have the keys they should
    assert isinstance(data, list)
    assert all("id" in level for level in data)
    assert all("title" in level for level in data)
    assert all("unlocked" in level for level in data)
    assert all("completed" in level for level in data)

def test_get_levels_for_invalid_user():
    user_id = 999  # inshallah this user does NOT exist

    response = client.get(f"/level/user/{user_id}")

    # checking that response not found + right message
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_complete_level_valid():
    # this assumes user {user_id} exists + level {level_id} is unlocked and not completed
    # pretty fucking specific test case

    """values need to be filled with valid values"""

    user_id = 1
    level_id = 1

    response = client.post("/level/complete", params={"user_id": user_id, "level_id": level_id})
    assert response.status_code == 200

    data = response.json()
    assert "completed" in data["message"]
    assert "unlocked" in data["message"]

def test_complete_level_locked():
    # this assumes user {user_id} has not unlocked level {level_id}
    user_id = 1
    level_id = 99

    response = client.post("/level/complete", params={"user_id": user_id, "level_id": level_id})
    assert response.status_code == 403
    assert response.json()["detail"] in ["Level not unlocked", "Level is still locked"]

def test_complete_level_nonexistent_user():
    # considering the user {user_id} ain't it + assuming level {level_id} is valid
    user_id = 9999
    level_id = 1

    response = client.post("/level/complete", params={"user_id": user_id, "level_id": level_id})
    assert response.status_code in [403, 404]  # just to be a little safe