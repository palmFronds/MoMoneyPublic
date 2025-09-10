import os
import json
from dotenv import load_dotenv
from firebase_admin import credentials, firestore, initialize_app

# Load .env for local development only
load_dotenv(override=True)

"""
THIS IS WRITTEN FOR RENDER LOCAL ENV
"""

firebase_cert = None

# using Secret File on that hoe
secret_file_path = "/etc/secrets/FIREBASE_CERTIFICATE"
if os.path.exists(secret_file_path):
    with open(secret_file_path, "r") as f:
        firebase_cert = json.load(f)
    cred = credentials.Certificate(firebase_cert)

# using local Dev – use FIREBASE_CRED_PATH from .env
else:
    cred_path = os.getenv("FIREBASE_CRED_PATH")
    if not cred_path or not os.path.exists(cred_path):
        raise FileNotFoundError("Firebase credentials not found in /etc/secrets/ or local path.")
    cred = credentials.Certificate(cred_path)

# Initialize Firebase
initialize_app(cred)
db = firestore.client()
