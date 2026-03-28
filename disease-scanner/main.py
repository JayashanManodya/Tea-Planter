# ============================================================
# IT24101737 -- Backend API & Integration
# Tea Leaf Disease Detector | Sri Lanka
# ============================================================
# FastAPI server -- loads best model from best_model.json
# POST /predict  -> returns detections + recommendations
# ============================================================

import json
import io
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import uvicorn
import os
from dotenv import load_dotenv
from ultralytics import YOLO
from recommendations import get_recommendation

# Load environment variables (relative to this script)
BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / "env.disease-scanner")

app = FastAPI(
    title="Tea Leaf Disease Detector API",
    description="Sri Lanka Tea Estate Disease Detection -- YOLOv8 Detect",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

CLASSES = [
    'Algal Leaf Spot',
    'Brown Blight',
    'Gray Blight',
    'Healthy',
    'Helopeltis',
    'Red Leaf Spot',
]

# Load best model at startup (use relative paths)
with open(BASE_DIR / "best_model.json") as f:
    best_info = json.load(f)

model = YOLO(str(BASE_DIR / "best.pt"))
print(f"Loaded : {best_info['run_label']}")
print(f"mAP50  : {best_info['map50']*100:.2f}%")


@app.get("/")
def root():
    return {
        "status"  : "running",
        "model"   : best_info["run_label"],
        "map50"   : f"{best_info['map50']*100:.2f}%",
        "classes" : CLASSES,
        "endpoint": "POST /predict -- upload a leaf image",
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    img      = Image.open(io.BytesIO(contents)).convert("RGB")

    results = model.predict(img, verbose=False, conf=0.25)
    boxes   = results[0].boxes

    # No detections
    if boxes is None or len(boxes) == 0:
        return {
            "detections"     : [],
            "summary"        : "No disease detected in this image",
            "recommendation" : get_recommendation("Healthy"),
            "model_info"     : {
                "run"  : best_info["run_label"],
                "map50": best_info["map50"],
            }
        }

    # Build detection list sorted by confidence (highest first)
    detections = []
    for box in boxes:
        cls_id     = int(box.cls[0])
        conf       = float(box.conf[0])
        xyxy       = box.xyxy[0].tolist()   # [x1, y1, x2, y2]
        disease    = CLASSES[cls_id]
        detections.append({
            "disease"   : disease,
            "confidence": round(conf, 4),
            "confidence_pct": f"{conf*100:.1f}%",
            "bbox"      : {
                "x1": round(xyxy[0], 1),
                "y1": round(xyxy[1], 1),
                "x2": round(xyxy[2], 1),
                "y2": round(xyxy[3], 1),
            },
        })

    detections.sort(key=lambda d: d["confidence"], reverse=True)

    # Primary disease = highest confidence detection
    primary_disease = detections[0]["disease"]
    rec = get_recommendation(primary_disease)

    # Count unique diseases found
    found_diseases  = list(dict.fromkeys(d["disease"] for d in detections))

    return {
        "detections"      : detections,
        "primary_disease" : primary_disease,
        "total_detections": len(detections),
        "diseases_found"  : found_diseases,
        "recommendation"  : rec,
        "model_info"      : {
            "run"  : best_info["run_label"],
            "map50": best_info["map50"],
        }
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
