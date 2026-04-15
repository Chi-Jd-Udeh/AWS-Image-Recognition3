import boto3
import base64
import uuid
import os
from io import BytesIO
from flask import Flask, request, jsonify, render_template
from PIL import Image
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)




BUCKET = os.getenv("S3_BUCKET")
AWS_REGION = os.getenv("AWS_REGION")

s3_client = boto3.client("s3", region_name=AWS_REGION)
rekognition_client = boto3.client("rekognition", region_name=AWS_REGION)


def upload_to_s3(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload raw bytes to S3 and return the S3 object key."""
    key = f"uploads/{uuid.uuid4().hex}_{filename}"
    s3_client.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return key


def detect_labels(s3_key: str) -> dict:
    """Run Rekognition on an S3 object. Returns labels with bounding boxes plus image dimensions."""
    response = rekognition_client.detect_labels(
        Image={"S3Object": {"Bucket": BUCKET, "Name": s3_key}},
        MaxLabels=10,
    )

    obj = s3_client.get_object(Bucket=BUCKET, Key=s3_key)
    img_bytes = obj["Body"].read()
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    img_w, img_h = img.size

    labels = []
    for label in response["Labels"]:
        instances = []
        for inst in label.get("Instances", []):
            bb = inst["BoundingBox"]
            instances.append({
                "left":   round(bb["Left"]   * img_w, 2),
                "top":    round(bb["Top"]    * img_h, 2),
                "width":  round(bb["Width"]  * img_w, 2),
                "height": round(bb["Height"] * img_h, 2),
            })
        labels.append({
            "name":       label["Name"],
            "confidence": round(label["Confidence"], 2),
            "instances":  instances,
        })

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "labels":       labels,
        "image_b64":    img_b64,
        "image_width":  img_w,
        "image_height": img_h,
    }


def cleanup_s3(s3_key: str):
    """Optionally remove the uploaded file from S3 after analysis."""
    try:
        s3_client.delete_object(Bucket=BUCKET, Key=s3_key)
    except Exception:
        pass  # non-fatal


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    1. Receive image from browser
    2. Upload to S3
    3. Run Rekognition against the S3 object
    4. Return labels + image dimensions as JSON
    5. Delete the S3 object after analysis
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    file_bytes = file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        return jsonify({"error": "File exceeds 10 MB limit"}), 400

    content_type = file.content_type or "image/jpeg"

    s3_key = upload_to_s3(file_bytes, file.filename, content_type)

    try:
        result = detect_labels(s3_key)
    finally:
        cleanup_s3(s3_key)

    return jsonify(result)




if __name__ == "__main__":
    app.run()
