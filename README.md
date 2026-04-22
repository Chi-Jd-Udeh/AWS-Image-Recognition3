# Rekognize — AWS Image Analyzer

A Flask web app that lets users upload an image, runs it through **AWS Rekognition**, and displays detected labels with bounding boxes overlaid on the image.

🔗 **Live demo:** [jdTheBean.pythonanywhere.com](https://jdTheBean.pythonanywhere.com)

---

## How It Works

1. User uploads an image through the browser (drag & drop or file picker)
2. The image is sent to the Flask server and uploaded to an **S3 bucket**
3. **AWS Rekognition** analyzes the S3 object and returns detected labels with confidence scores and bounding box coordinates
4. Results are displayed in the browser with boxes drawn over the image
5. The image is deleted from S3 after analysis

Here's an example of a processed image...

<img width="1607" height="808" alt="Architect" src="https://github.com/Chi-Jd-Udeh/Image-box/blob/main/pup_rekognize.png?raw=true" />
---

# AWS Architecture

<img width="1607" height="808" alt="Architect" src="https://github.com/Chi-Jd-Udeh/Image-box/blob/main/aws_rekognize_diagram.png?raw=true" />
 
---
 
## Services Used
 
**S3 (Simple Storage Service)**
Temporary storage for uploaded images. When a user submits an image, it is uploaded to a private S3 bucket first so that Rekognition can access it. The image is deleted from the bucket automatically after analysis completes.
 
**Rekognition**
Amazon's image analysis service. It reads the image directly from S3, detects objects and scenes, and returns a list of labels with confidence scores and bounding box coordinates. No model training or configuration is required.
 
**IAM (Identity and Access Management)**
Controls which AWS actions the app is allowed to perform. The app authenticates using an IAM user's access keys and is granted only the specific S3 and Rekognition permissions it needs.
 
---
 
## IAM Permissions Required
 
| Permission | Why it's needed |
|---|---|
| `s3:PutObject` | Upload the user's image to S3 |
| `s3:GetObject` | Read the image back from S3 to return it to the browser |
| `s3:DeleteObject` | Delete the image from S3 after analysis |
| `rekognition:DetectLabels` | Run label detection on the uploaded image |
 
---
## AWS Cost Breakdown

| Service | Usage Assumption | Estimated Cost |
|--------|----------------|---------------|
| Amazon S3 | ~1GB storage + 1,000 requests | ~$0.02 – $0.05 |
| AWS Lambda / EC2 (Flask App) | Low compute usage | ~$0.00 (Free Tier) |
| Amazon API Gateway | ~1,000 requests | ~$0.00 – $0.01 |
| Amazon Rekognition | 1,000 image analyses | ~$1.00 |
| **Total** | — | **~$1 – $1.10/month** |

---
## License

MIT

