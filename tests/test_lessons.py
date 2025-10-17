import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# manually hardcoding the path since pytest can't find the fucking root repo

"""BOO THANG THE TESTS ONLY WORK IF THE DB IS ALREADY LOADED"""

from fastapi.testclient import TestClient
from main import app

"""run this with pytest -v tests/test_lessons.py"""

client = TestClient(app)

# only microlearning test section since quiz explanation endpoints are
# technically called inside user_answer router and not its own

def test_get_micro_slide_by_order_success():
    # known level and slide test case from the seeded DB
    """the tests are hard-coded, change manually"""

    level_id = 1
    order = 1

    response = client.get(f"/microlearning/api/{level_id}/{order}")
    assert response.status_code == 200 # 200: the server has returned the requested data

    data = response.json()
    assert data["level_id"] == level_id # checking that it's the right level_id
    assert data["current_page"] == order # checking that the order's legit
    assert "title" in data  # adjust based on your actual schema

def test_get_micro_slide_by_order_not_found():
    # using a level_id + order combination that doesn't exist
    response = client.get("/microlearning/api/999/999")

    assert response.status_code == 404 # checking that it springs a 404
    assert response.json()["detail"] == "Slide not found"

    # using a level_id that doesn't exist
    response = client.get("/microlearning/api/1/999")

    assert response.status_code == 404  # checking that it springs a 404
    assert response.json()["detail"] == "Slide not found"

    # using an order that doesn't exist
    response = client.get("/microlearning/api/999/1")

    assert response.status_code == 404  # checking that it springs a 404
    assert response.json()["detail"] == "Slide not found"