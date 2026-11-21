from ultralytics import YOLO

# Load trained YOLO model
model = YOLO("runs/detect/train-2/weights/best.pt")

phone_camera_url = "http://192.168.1"

# Run live predictions from your phone camera
results = model.predict(
    source="photos/img.jpeg",
    show=True,
    conf=0.70,
    stream=True
)

# Process live camera frames
for result in results:
    print("Vehicles detected:", len(result.boxes))

    # python -c "from ultralytics import YOLO; model=YOLO('runs/detect/train-2/weights/best.pt'); model.predict(source=0, conf=0.75, show=True)"