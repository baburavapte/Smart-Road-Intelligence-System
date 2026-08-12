"""
Pothole Detection Inference Service
Flask microservice wrapping YOLOv8 model for pothole detection.
"""

import os
import uuid
from datetime import datetime

import cv2
# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
# pyrefly: ignore [missing-import]
from ultralytics import YOLO


app = Flask(__name__)
CORS(app)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "best_weights.pt"
)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)


# ============================================================
# LOAD YOLO MODEL
# ============================================================

print(f"[INFO] Loading YOLOv8 model from {MODEL_PATH}...")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"YOLO model not found at: {MODEL_PATH}"
    )

model = YOLO(MODEL_PATH)

print("[INFO] Model loaded successfully!")


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "timestamp": datetime.now().isoformat()
    })


# ============================================================
# YOLO DETECTION
# ============================================================

@app.route("/detect", methods=["POST"])
def detect():

    # Check image field
    if "image" not in request.files:
        return jsonify({
            "success": False,
            "error": "No image file provided"
        }), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "No file selected"
        }), 400

    # Generate unique ID
    file_id = str(uuid.uuid4())

    # Get extension
    ext = os.path.splitext(file.filename)[1].lower()

    if not ext:
        ext = ".jpg"

    # Only allow common image formats
    allowed_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    }

    if ext not in allowed_extensions:
        return jsonify({
            "success": False,
            "error": "Unsupported image format"
        }), 400

    original_filename = f"{file_id}_original{ext}"
    annotated_filename = f"{file_id}_annotated{ext}"

    original_path = os.path.join(
        UPLOAD_DIR,
        original_filename
    )

    annotated_path = os.path.join(
        RESULTS_DIR,
        annotated_filename
    )

    try:

        # ----------------------------------------------------
        # SAVE UPLOADED IMAGE
        # ----------------------------------------------------

        file.save(original_path)

        print(
            f"[INFO] Image received: "
            f"{original_filename}"
        )

        # ----------------------------------------------------
        # VERIFY IMAGE CAN BE READ
        # ----------------------------------------------------

        img = cv2.imread(original_path)

        if img is None:
            return jsonify({
                "success": False,
                "error": "OpenCV could not read the uploaded image"
            }), 400

        # ----------------------------------------------------
        # YOLO INFERENCE
        # ----------------------------------------------------

        print("[INFO] Running YOLO inference...")

        results = model.predict(
            source=original_path,
            conf=0.25,
            save=False,
            verbose=False
        )

        result = results[0]

        detections = []

        # ----------------------------------------------------
        # PARSE YOLO DETECTIONS
        # ----------------------------------------------------

        if result.boxes is not None and len(result.boxes) > 0:

            for box in result.boxes:

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                confidence = float(box.conf[0])

                class_id = int(box.cls[0])

                class_name = model.names.get(
                    class_id,
                    "pothole"
                )

                detections.append({
                    "bbox": {
                        "x1": round(x1, 2),
                        "y1": round(y1, 2),
                        "x2": round(x2, 2),
                        "y2": round(y2, 2)
                    },
                    "confidence": round(
                        confidence,
                        4
                    ),
                    "class_id": class_id,
                    "class_name": class_name
                })

        print(
            f"[INFO] Potholes detected: "
            f"{len(detections)}"
        )

        # ----------------------------------------------------
        # DRAW DETECTIONS
        # ----------------------------------------------------

        for det in detections:

            bbox = det["bbox"]

            x1 = int(bbox["x1"])
            y1 = int(bbox["y1"])
            x2 = int(bbox["x2"])
            y2 = int(bbox["y2"])

            confidence = det["confidence"]

            label = (
                f"{det['class_name']} "
                f"{confidence:.2f}"
            )

            # Bounding box
            cv2.rectangle(
                img,
                (x1, y1),
                (x2, y2),
                (0, 0, 255),
                3
            )

            # Text size
            (
                label_w,
                label_h
            ), baseline = cv2.getTextSize(
                label,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                2
            )

            # Keep label inside image
            label_y1 = max(
                0,
                y1 - label_h - 10
            )

            label_y2 = max(
                label_h + 10,
                y1
            )

            # Label background
            cv2.rectangle(
                img,
                (x1, label_y1),
                (
                    x1 + label_w + 10,
                    label_y2
                ),
                (0, 0, 255),
                -1
            )

            # Label text
            cv2.putText(
                img,
                label,
                (x1 + 5, label_y2 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2
            )

        # ----------------------------------------------------
        # SAVE ANNOTATED IMAGE
        # ----------------------------------------------------

        saved = cv2.imwrite(
            annotated_path,
            img
        )

        if not saved:
            raise RuntimeError(
                "Failed to save annotated image"
            )

        # ----------------------------------------------------
        # IMAGE DIMENSIONS
        # ----------------------------------------------------

        height, width = img.shape[:2]

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        response = {
            "success": True,
            "file_id": file_id,

            "original_image": original_filename,

            "annotated_image": annotated_filename,

            "image_dimensions": {
                "width": width,
                "height": height
            },

            "pothole_count": len(detections),

            "detections": detections,

            "timestamp": datetime.now().isoformat()
        }

        print("[INFO] Detection completed successfully")

        return jsonify(response), 200

    except Exception as e:

        print(
            "[ERROR] Detection failed:",
            repr(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# SERVE RESULT IMAGE
# ============================================================

@app.route("/results/<filename>", methods=["GET"])
def get_result_image(filename):

    filepath = os.path.join(
        RESULTS_DIR,
        filename
    )

    if os.path.exists(filepath):
        return send_file(filepath)

    return jsonify({
        "success": False,
        "error": "File not found"
    }), 404


# ============================================================
# SERVE ORIGINAL IMAGE
# ============================================================

@app.route("/uploads/<filename>", methods=["GET"])
def get_upload_image(filename):

    filepath = os.path.join(
        UPLOAD_DIR,
        filename
    )

    if os.path.exists(filepath):
        return send_file(filepath)

    return jsonify({
        "success": False,
        "error": "File not found"
    }), 404


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            5001
        )
    )

    print(
        f"[INFO] Starting Flask service "
        f"on port {port}"
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )