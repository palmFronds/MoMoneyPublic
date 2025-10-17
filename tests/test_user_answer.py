import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# manually hardcoding the path since pytest can't find the root repo

"""BOO THANG THE TESTS ONLY WORK IF THE DB IS ALREADY LOADED"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# database gotta be emptied + reseeded for this to work
def test_submit_answer_correct():
    """testing a post with the valid, correct answer from seeded DB"""
    payload = {
        "level_id": 1,
        "question_id": 1,
        "question_order": 1,
        "selected_option_id": 3,   # assuming this is a correct option in seeded DB
        "user_id": 1               # needed to process request apparently???
    }

    response = client.post("/answers/", json=payload)
    assert response.status_code == 200 # processed correctly

    data = response.json()
    assert data["is_correct"] is True   # router updated correctness
    assert "explanation" in data        # explanation was returned from router
    assert isinstance(data["user_answer_id"], int)

def test_submit_answer_incorrect():
    """testing a valid, incorrect answer"""

    payload = {
        "level_id": 1,
        "question_id": 1,
        "question_order": 1,
        "selected_option_id": 2,  # assuming this is still an incorrect option in seeded DB
        "user_id": 1  # why dafaq
    }

    response = client.post("/answers/", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["is_correct"] is False
    assert "explanation" in data
    assert isinstance(data["user_answer_id"], int)
    # checking that it has what it should and marked incorrect

def test_submit_answer_invalid_option():
    """test case where selected option ID does not exist"""

    payload = {
        "level_id": 1,
        "question_id": 1,
        "question_order": 1,
        "selected_option_id": 9999,
        "user_id": 1
    }

    response = client.post("/answers/", json=payload)
    assert response.status_code == 400 # request issue, not server
    assert response.json()["detail"] == "Invalid option selected"

def test_submit_answer_option_invalid_question():
    """Test case where selected option exists but belongs to another question"""

    payload = {
        "level_id": 1,
        "question_id": 1,
        "question_order": 1,
        "selected_option_id": 5, # option exists for question 2
        "user_id": 1
    }

    response = client.post("/answers/", json=payload)
    assert response.status_code == 400 # request issue, not server
    assert response.json()["detail"] == "Option does not belong to question"