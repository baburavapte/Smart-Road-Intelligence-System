"""
Pothole Detection Inference Service
Flask microservice wrapping YOLOv8 model for pothole detection.
"""

import os
import uuid
import json
from datetime import datetime

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ultralytics import YOLO
# import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

# Configuration
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'best_weights.pt')
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# Load model once at startup
print(f"[INFO] Loading YOLOv8 model from {MODEL_PATH}...")
model = YOLO(MODEL_PATH)
print("[INFO] Model loaded successfully!")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/detect', methods=['POST'])
def detect():
    """
    Detect potholes in an uploaded image.
    
    Expects: multipart/form-data with 'image' file field
    Returns: JSON with detections + path to annotated image
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Generate unique filename
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or '.jpg'
    original_filename = f"{file_id}_original{ext}"
    annotated_filename = f"{file_id}_annotated{ext}"

    original_path = os.path.join(UPLOAD_DIR, original_filename)
    annotated_path = os.path.join(RESULTS_DIR, annotated_filename)

    # Save uploaded image
    file.save(original_path)

    try:
        # Run YOLOv8 inference
        results = model.predict(
            source=original_path,
            conf=0.25,
            save=False,
            verbose=False
        )

        result = results[0]
        detections = []

        # Parse detections
        if result.boxes is not None and len(result.boxes) > 0:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = model.names.get(class_id, 'pothole')

                detections.append({
                    'bbox': {
                        'x1': round(x1, 2),
                        'y1': round(y1, 2),
                        'x2': round(x2, 2),
                        'y2': round(y2, 2)
                    },
                    'confidence': round(confidence, 4),
                    'class_id': class_id,
                    'class_name': class_name
                })

        # Create annotated image
        img = cv2.imread(original_path)
        for det in detections:
            bbox = det['bbox']
            x1, y1 = int(bbox['x1']), int(bbox['y1'])
            x2, y2 = int(bbox['x2']), int(bbox['y2'])
            conf = det['confidence']
            label = f"{det['class_name']} {conf:.2f}"

            # Draw bounding box (red for potholes)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 3)

            # Draw label background
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
            cv2.rectangle(img, (x1, y1 - label_h - 10), (x1 + label_w + 10, y1), (0, 0, 255), -1)
            cv2.putText(img, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        cv2.imwrite(annotated_path, img)

        # Get image dimensions
        h, w = img.shape[:2]

        response = {
            'success': True,
            'file_id': file_id,
            'original_image': original_filename,
            'annotated_image': annotated_filename,
            'image_dimensions': {'width': w, 'height': h},
            'pothole_count': len(detections),
            'detections': detections,
            'timestamp': datetime.now().isoformat()
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500


@app.route('/results/<filename>', methods=['GET'])
def get_result_image(filename):
    """Serve annotated result images."""
    filepath = os.path.join(RESULTS_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath)
    return jsonify({'error': 'File not found'}), 404


@app.route('/uploads/<filename>', methods=['GET'])
def get_upload_image(filename):
    """Serve original uploaded images."""
    filepath = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath)
    return jsonify({'error': 'File not found'}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
