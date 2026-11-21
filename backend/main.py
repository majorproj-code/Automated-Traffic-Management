from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from typing import List
from fastapi import UploadFile, File

from ultralytics import YOLO

import numpy as np
import cv2

from pathlib import Path

import firebase_admin
from firebase_admin import credentials, db
from pathlib import Path


# =================================
# 1. INITIALIZE FASTAPI
# =================================

app = FastAPI(
    title="AI Smart Traffic Management API",
    description="YOLO11n Vehicle Detection and Adaptive Traffic Control",
    version="1.0"
)

# Firebase Connection

BASE_DIR = Path(__file__).resolve().parent

cred = credentials.Certificate(
    str(BASE_DIR / "firebase-service-account.json")
)

firebase_admin.initialize_app(
    cred,
    {
        "databaseURL": "https://ai-smart-traffic-e782a-default-rtdb.asia-southeast1.firebasedatabase.app/"
    }
)


# =================================
# 2. CORS CONFIGURATION
# =================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://automated-traffic.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =================================
# 3. LOAD YOLO MODEL
# =================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR.parent
    / "AI_Model"
    / "runs"
    / "detect"
    / "train-2"
    / "weights"
    / "best.pt"
)

if not MODEL_PATH.exists():

    raise FileNotFoundError(
        f"YOLO model not found: {MODEL_PATH}. "
        "Update MODEL_PATH to your actual best.pt location."
    )

model = YOLO(str(MODEL_PATH))

print("YOLO11n model loaded successfully!")


# =================================
# 4. TRAFFIC DENSITY
# =================================

def calculate_density(count):

    if count <= 1:
        return "LOW"

    elif count <= 2:
        return "MEDIUM"

    elif count <= 3:
        return "HIGH"

    else:
        return "VERY HIGH"


# =================================
# 5. ADAPTIVE SIGNAL ALGORITHM
# =================================

def select_green_road(vehicle_counts):

    selected = max(
        vehicle_counts,
        key=vehicle_counts.get
    )

    return selected


def calculate_green_duration(density):

    if density == "LOW":
        return 15

    elif density == "MEDIUM":
        return 20

    elif density == "HIGH":
        return 30

    elif density == "VERY HIGH":
        return 45

    else:
        return 0


# =================================
# 6. VEHICLE DETECTION
# =================================

def detect_vehicles(image):

    results = model.predict(
        source=image,
        conf=0.75,
        verbose=False
    )

    result = results[0]

    if result.boxes is None:
        vehicle_count = 0
    else:
        vehicle_count = len(result.boxes)

    annotated_image = result.plot()

    return vehicle_count, annotated_image


# =================================
# 7. MAIN ANALYSIS API
# =================================

import time

@app.post("/api/analyze")
async def analyze_traffic(files: List[UploadFile] = File(...)):

    # STEP 1: Validate five uploaded images
    if len(files) != 5:
        raise HTTPException(
            status_code=400,
            detail="Please upload exactly 5 road images."
        )

    vehicle_counts = {}
    traffic_density = {}

    road_names = [
        "road1",
        "road2",
        "road3",
        "road4",
        "road5"
    ]

    # STEP 2: YOLO vehicle detection
    for road, file in zip(road_names, files):

        image_bytes = await file.read()

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if image is None:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image for {road}"
            )

        results = model.predict(
            source=image,
            conf=0.20,
            verbose=False
        )

        count = len(results[0].boxes)

        vehicle_counts[road] = count

        # STEP 3: Traffic density
        if count <= 1:
            density = "LOW"

        elif count <= 2:
            density = "MEDIUM"

        elif count <= 3:
            density = "HIGH"

        else:
            density = "VERY HIGH"

        traffic_density[road] = density

    # STEP 4: Road pairing configuration
    PAIR_MAP = {
        "road1": ["road1", "road3"],
        "road2": ["road2", "road4"],
        "road3": ["road3", "road5"],
        "road4": ["road4", "road2"],
        "road5": ["road5", "road3"]
    }

    # STEP 5: Select maximum traffic road
    max_count = max(vehicle_counts.values())

    if max_count > 0:

        selected_road = max(
            vehicle_counts,
            key=vehicle_counts.get
        )

        green_roads = PAIR_MAP[selected_road]

    else:

        selected_road = None
        green_roads = []

    # STEP 6: Generate signal status
    signals = {}

    for road in road_names:

        if road in green_roads:
            signals[road] = "GREEN"

        else:
            signals[road] = "RED"

    # # STEP 7: Testing duration
    # green_duration = 5

    # STEP 7: Calculate dynamic green duration

    if selected_road is not None:

        selected_density = traffic_density[selected_road]

        green_duration = calculate_green_duration(selected_density)

    else:
        green_duration = 0

    # STEP 8: Prepare Firebase data
    firebase_data = {
    "command_id": int(time.time() * 1000),
    "vehicle_counts": vehicle_counts,
    "traffic_density": traffic_density,
    "selected_road": selected_road,
    "green_roads": green_roads,
    "green_duration": green_duration,
    "signals": signals,
    "status": "PENDING"
    }

    # STEP 9: Send data to Firebase
    try:

        db.reference(
            "traffic_system/current_command"
        ).set(firebase_data)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Firebase error: {str(e)}"
        )

    # STEP 10: Return results to React
    return {

        "status": "success",

        "vehicle_counts": vehicle_counts,

        "traffic_density": traffic_density,

        "selected_road": selected_road,

        "green_roads": green_roads,

        "green_duration": green_duration,

        "signals": signals,

        "message": "AI analysis completed and Firebase updated."
    }

