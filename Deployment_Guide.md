# Smart Pothole Detection System
## Complete Technical Reference & Deployment Guide

---

# TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Complete File Structure](#3-complete-file-structure)
4. [Service 1 — Python Flask Inference (Port 5001)](#4-service-1--python-flask-inference-port-5001)
5. [Service 2 — Node.js Express Backend (Port 3000)](#5-service-2--nodejs-express-backend-port-3000)
6. [Service 3 — Angular Frontend (Port 4200)](#6-service-3--angular-frontend-port-4200)
7. [MongoDB Database Schema](#7-mongodb-database-schema)
8. [Complete API Reference](#8-complete-api-reference)
9. [Environment Variables & Configuration](#9-environment-variables--configuration)
10. [Port Map & Service Dependencies](#10-port-map--service-dependencies)
11. [Local Development Setup](#11-local-development-setup)
12. [Deployment Option A — Docker Compose](#12-deployment-option-a--docker-compose)
13. [Deployment Option B — Cloud VM (AWS/GCP/Azure)](#13-deployment-option-b--cloud-vm-awsgcpazure)
14. [Deployment Option C — Railway / Render (Free Tier)](#14-deployment-option-c--railway--render-free-tier)
15. [Common Issues & Fixes](#15-common-issues--fixes)

---

# 1. Project Overview

| Property | Value |
|---|---|
| **Project Name** | Smart Pothole Detection System |
| **Type** | College Minor Project |
| **AI Model** | YOLOv8 (Ultralytics) |
| **Model Weights** | `best_weights.pt` (~50 MB) |
| **Frontend** | Angular 17 (Standalone Components) |
| **Backend API** | Node.js + Express.js |
| **Inference** | Python 3.x + Flask |
| **Database** | MongoDB (NoSQL) |
| **Design** | Dark theme, glassmorphism, CSS3 animations |

**What this app does:** Users upload road images → Node.js forwards them to Python → YOLOv8 detects potholes and draws bounding boxes → results are saved to MongoDB → Angular displays annotated images with severity ratings.

---

# 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                          │
│                     http://localhost:4200                       │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP (Upload Image)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              SERVICE 3: Angular Frontend (:4200)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Home    │ │ Detect   │ │ History  │ │Dashboard │          │
│  │Component │ │Component │ │Component │ │Component │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                    │                                            │
│              ApiService (HttpClient)                            │
└────────────────────┬────────────────────────────────────────────┘
                     │  HTTP POST /api/detect
                     │  HTTP GET  /api/detections
                     │  HTTP GET  /api/stats
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              SERVICE 2: Express.js Backend (:3000)              │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐         │
│  │  routes/detect.js                                  │         │
│  │  POST /api/detect    → proxy to Flask              │         │
│  │  GET  /api/detections → query MongoDB              │         │
│  │  GET  /api/detections/:id → query MongoDB          │         │
│  │  GET  /api/stats     → aggregate MongoDB           │         │
│  │  DELETE /api/detections/:id → delete from MongoDB  │         │
│  └────────────────────────────────────────────────────┘         │
│                    │                         │                   │
│         Proxy (axios)              Mongoose ODM                 │
└────────────┬───────────────────────┬────────────────────────────┘
             │                       │
             ▼                       ▼
┌──────────────────────┐   ┌──────────────────────┐
│ SERVICE 1: Flask     │   │   MongoDB Database   │
│ Inference (:5001)    │   │ db: pothole-detection │
│                      │   │ collection: detections│
│ POST /detect         │   └──────────────────────┘
│  → YOLOv8 predict    │
│  → cv2 draw boxes    │
│  → return JSON       │
│                      │
│ GET /results/<file>  │
│ GET /uploads/<file>  │
└──────────────────────┘
```

---

# 3. Complete File Structure

```
white-rosette/                          ← Project Root
│
├── README.md                           ← Setup instructions
├── Project_Report.md                   ← 40-page college report
│
├── inference-service/                  ← SERVICE 1: Python Flask
│   ├── app.py                          ← Flask app (YOLOv8 inference)
│   ├── requirements.txt                ← Python dependencies
│   ├── models/
│   │   └── best_weights.pt             ← YOLOv8 trained model (~50MB)
│   ├── uploads/                        ← Original uploaded images (auto-created)
│   ├── results/                        ← Annotated output images (auto-created)
│   └── venv/                           ← Python virtual environment (NOT committed)
│
├── server/                             ← SERVICE 2: Node.js Express
│   ├── server.js                       ← Express entry point
│   ├── package.json                    ← Node dependencies
│   ├── package-lock.json               ← Lock file
│   ├── models/
│   │   └── Detection.js                ← Mongoose schema
│   ├── routes/
│   │   └── detect.js                   ← All API routes
│   ├── uploads/                        ← Temporary uploads (auto-created, cleaned)
│   └── node_modules/                   ← (NOT committed, run `npm install`)
│
└── client/                             ← SERVICE 3: Angular Frontend
    ├── angular.json                    ← Angular CLI configuration
    ├── package.json                    ← Angular dependencies
    ├── tsconfig.json                   ← TypeScript config
    ├── tsconfig.app.json
    └── src/
        ├── index.html                  ← Root HTML
        ├── main.ts                     ← Angular bootstrap
        ├── styles.css                  ← Global CSS (theme, animations)
        ├── favicon.ico
        └── app/
            ├── app.component.ts        ← Root component (navbar + footer)
            ├── app.component.html
            ├── app.component.css
            ├── app.config.ts           ← App providers (router, HttpClient)
            ├── app.routes.ts           ← All route definitions
            ├── services/
            │   └── api.service.ts      ← HTTP service to Express backend
            └── components/
                ├── home/
                │   └── home.component.ts        ← Landing page
                ├── detect/
                │   └── detect.component.ts      ← Image upload + trigger
                ├── result/
                │   └── result.component.ts      ← Annotated image viewer
                ├── history/
                │   └── history.component.ts     ← Past detections grid
                ├── dashboard/
                │   └── dashboard.component.ts   ← Stats KPIs + charts
                └── about/
                    └── about.component.ts       ← Project info page
```

---

# 4. Service 1 — Python Flask Inference (Port 5001)

### File: `inference-service/app.py`

**Purpose:** Wraps the YOLOv8 model as an HTTP microservice. Loads `best_weights.pt` once at startup, accepts image uploads, runs inference, draws bounding boxes with OpenCV, and returns JSON results.

**Key Behavior:**
- Model is loaded **once at startup** (not per-request) for performance
- Each uploaded image gets a **UUID-based filename** to prevent collisions
- Bounding boxes are drawn using `cv2.rectangle` in red `(0, 0, 255)`
- Confidence threshold is set to `0.25` (25%)
- Original images are stored in `uploads/`, annotated images in `results/`

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns service health and model status |
| `POST` | `/detect` | Accepts `multipart/form-data` with `image` field. Returns JSON with bounding boxes, confidence scores, and annotated image filename |
| `GET` | `/results/<filename>` | Serves the annotated image file |
| `GET` | `/uploads/<filename>` | Serves the original uploaded image |

**Response format from `POST /detect`:**
```json
{
  "success": true,
  "file_id": "uuid-string",
  "original_image": "uuid_original.png",
  "annotated_image": "uuid_annotated.png",
  "image_dimensions": { "width": 640, "height": 640 },
  "pothole_count": 2,
  "detections": [
    {
      "bbox": { "x1": 134.12, "y1": 264.36, "x2": 535.33, "y2": 452.99 },
      "confidence": 0.9365,
      "class_id": 0,
      "class_name": "Pothole"
    }
  ]
}
```

**Dependencies (`requirements.txt`):**
```
flask
flask-cors
ultralytics
opencv-python-headless
pillow
numpy
```

---

# 5. Service 2 — Node.js Express Backend (Port 3000)

### File: `server/server.js`
**Purpose:** Main Express app entry point. Connects to MongoDB via Mongoose, sets up CORS for Angular, and mounts the API routes.

**Key Config:**
- CORS origins: `http://localhost:4200`, `http://localhost:4000`
- MongoDB URI: `mongodb://localhost:27017/pothole-detection`
- Starts on port `3000`

### File: `server/routes/detect.js`
**Purpose:** All API route handlers. Uses `multer` for file uploads and `axios` + `form-data` to proxy images to Flask.

**Critical variable:**
```javascript
const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';
```

> [!IMPORTANT]
> **For deployment**, change `FLASK_URL` to the actual URL where Flask is hosted (e.g., `https://your-flask-app.railway.app`).

### File: `server/models/Detection.js`
**Purpose:** Mongoose schema definition for detection documents.

**Severity is auto-calculated** via a `pre('save')` hook:
| Pothole Count | Severity |
|---|---|
| 0 | `none` |
| 1-2 | `low` |
| 3-5 | `medium` |
| 6-10 | `high` |
| >10 | `critical` |

**Dependencies (`package.json`):**
```json
{
  "express": "^4.18.2",
  "mongoose": "^8.1.1",
  "multer": "^1.4.5-lts.1",
  "cors": "^2.8.5",
  "axios": "^1.6.5",
  "dotenv": "^16.3.1",
  "form-data": "^4.0.0"
}
```

---

# 6. Service 3 — Angular Frontend (Port 4200)

### Key Files:

| File | Purpose |
|---|---|
| `app.config.ts` | Registers `provideRouter` and `provideHttpClient` |
| `app.routes.ts` | Maps URL paths to page components |
| `app.component.ts` | Root shell: navbar + `<router-outlet>` + footer |
| `services/api.service.ts` | HTTP client calling Express backend at `http://localhost:3000/api` |
| `styles.css` | Global dark theme CSS with CSS variables, glassmorphism, animations |

### Pages:

| Route | Component | What It Does |
|---|---|---|
| `/` | `HomeComponent` | Hero section, feature cards, CTA |
| `/detect` | `DetectComponent` | Drag-and-drop upload, calls `POST /api/detect` |
| `/results/:id` | `ResultComponent` | Shows annotated image, pothole count, severity |
| `/history` | `HistoryComponent` | Paginated grid of past detections |
| `/dashboard` | `DashboardComponent` | KPI cards, severity distribution bars, recent activity |
| `/about` | `AboutComponent` | Project description, tech stack info |

> [!IMPORTANT]
> **For deployment**, edit `api.service.ts` line:
> ```typescript
> private apiUrl = 'http://localhost:3000/api';
> ```
> Change `http://localhost:3000` to the deployed Express backend URL.

---

# 7. MongoDB Database Schema

**Database name:** `pothole-detection`
**Collection name:** `detections`

```javascript
{
  _id: ObjectId,                    // Auto-generated MongoDB ID
  fileId: String,                   // UUID from Flask response
  originalImage: String,            // Filename: "uuid_original.png"
  annotatedImage: String,           // Filename: "uuid_annotated.png"
  originalFilename: String,         // User's original filename
  imageDimensions: {
    width: Number,
    height: Number
  },
  potholeCount: Number,             // Total potholes detected
  detections: [{                    // Array of individual detections
    bbox: {
      x1: Number, y1: Number,      // Top-left corner
      x2: Number, y2: Number       // Bottom-right corner
    },
    confidence: Number,             // 0.0 to 1.0
    classId: Number,                // Class index from model
    className: String               // e.g., "Pothole"
  }],
  status: String,                   // "processing" | "completed" | "failed"
  severity: String,                 // "none" | "low" | "medium" | "high" | "critical"
  createdAt: Date,                  // Auto-generated (timestamps: true)
  updatedAt: Date                   // Auto-generated (timestamps: true)
}
```

---

# 8. Complete API Reference

## Express Backend (`http://localhost:3000`)

### `POST /api/detect`
Upload an image and run pothole detection.
- **Content-Type:** `multipart/form-data`
- **Body:** `image` (file field, max 50MB, accepts jpeg/png/webp/bmp)
- **Response:** `{ success: true, detection: { id, fileId, annotatedImage, potholeCount, severity, detections[], ... } }`

### `GET /api/detections?page=1&limit=20`
Get paginated list of all past detections.
- **Response:** `{ success: true, data: Detection[], pagination: { page, limit, total, totalPages } }`

### `GET /api/detections/:id`
Get a single detection by MongoDB `_id`.
- **Response:** `{ success: true, detection: Detection }`

### `GET /api/stats`
Get aggregated dashboard statistics.
- **Response:** `{ success: true, stats: { totalDetections, totalPotholes, avgPotholesPerImage, severityDistribution, dailyDetections, recentDetections } }`

### `DELETE /api/detections/:id`
Delete a detection record from MongoDB.
- **Response:** `{ success: true, message: "Detection deleted" }`

### `GET /api/health`
Health check.
- **Response:** `{ status: "healthy", service: "pothole-detection-api", mongodb: "connected" }`

## Flask Inference (`http://localhost:5001`)

### `POST /detect`
Run YOLOv8 inference on an uploaded image.
- **Body:** `image` (file field)
- **Response:** JSON with bounding boxes, confidence scores, annotated image filename

### `GET /results/<filename>`
Serve an annotated result image.

### `GET /uploads/<filename>`
Serve an original uploaded image.

### `GET /health`
Health check for Flask service.

---

# 9. Environment Variables & Configuration

## Values to change for deployment:

| Service | Variable / Location | Local Value | Change To |
|---|---|---|---|
| **Flask** | `app.py` line `app.run(port=...)` | `5001` | Your deployment port or use env var |
| **Flask** | `app.py` `MODEL_PATH` | Relative `./models/best_weights.pt` | Absolute path on server |
| **Express** | `routes/detect.js` `FLASK_URL` | `http://localhost:5001` | Deployed Flask URL |
| **Express** | `server.js` `MONGO_URI` | `mongodb://localhost:27017/pothole-detection` | MongoDB Atlas connection string |
| **Express** | `server.js` `PORT` | `3000` | `process.env.PORT` (cloud assigns this) |
| **Angular** | `api.service.ts` `apiUrl` | `http://localhost:3000/api` | Deployed Express URL |

### Recommended `.env` file for Express (`server/.env`):
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/pothole-detection
FLASK_URL=http://localhost:5001
```

---

# 10. Port Map & Service Dependencies

```
Port 4200  →  Angular Frontend (user-facing)
     │
     │ calls
     ▼
Port 3000  →  Express Backend (API gateway)
     │
     ├── connects to MongoDB (Port 27017)
     │
     └── proxies images to
         ▼
Port 5001  →  Flask Inference (AI model)
```

**Startup order matters:**
1. Start MongoDB first (must be running)
2. Start Flask (loads the YOLOv8 model into RAM)
3. Start Express (connects to both MongoDB and Flask)
4. Start Angular (connects to Express)

---

# 11. Local Development Setup

```bash
# Terminal 1 — Flask Inference
cd inference-service
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# → Running on http://127.0.0.1:5001

# Terminal 2 — Express Backend
cd server
npm install
npm run dev
# → Express server running on http://localhost:3000

# Terminal 3 — Angular Frontend
cd client
npm install
npm start
# → Angular running on http://localhost:4200
```

---

# 12. Deployment Option A — Docker Compose

Create these files in the project root:

### `Dockerfile.flask`
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY inference-service/ .
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5001
CMD ["python", "app.py"]
```

### `Dockerfile.express`
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY server/ .
RUN npm ci --production

EXPOSE 3000
CMD ["node", "server.js"]
```

### `Dockerfile.angular`
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY client/ .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist/client/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### `nginx.conf`
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://express:3000;
    }
}
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  flask:
    build:
      context: .
      dockerfile: Dockerfile.flask
    ports:
      - "5001:5001"
    depends_on:
      - mongodb

  express:
    build:
      context: .
      dockerfile: Dockerfile.express
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/pothole-detection
      - FLASK_URL=http://flask:5001
    depends_on:
      - mongodb
      - flask

  angular:
    build:
      context: .
      dockerfile: Dockerfile.angular
    ports:
      - "80:80"
    depends_on:
      - express

volumes:
  mongo-data:
```

### Run:
```bash
docker-compose up --build
```
Then open `http://localhost` in your browser.

---

# 13. Deployment Option B — Cloud VM (AWS/GCP/Azure)

1. **Provision a VM** (Ubuntu 22.04, minimum 4GB RAM, 2 vCPU)
2. **Install prerequisites:**
   ```bash
   sudo apt update && sudo apt install -y python3 python3-pip python3-venv nodejs npm mongodb
   ```
3. **Clone/upload your project** to the VM
4. **Update configuration:**
   - `api.service.ts`: Change `apiUrl` to `http://YOUR_VM_PUBLIC_IP:3000/api`
   - `routes/detect.js`: `FLASK_URL` stays `http://localhost:5001` (same machine)
   - `server.js`: `MONGO_URI` stays `mongodb://localhost:27017/pothole-detection`
5. **Build Angular for production:**
   ```bash
   cd client && npm install && npm run build
   ```
6. **Serve Angular** using Nginx (copy `dist/` to `/var/www/html`)
7. **Use PM2** to keep Node and Python running:
   ```bash
   npm install -g pm2
   pm2 start server/server.js --name express-api
   pm2 start inference-service/app.py --interpreter python3 --name flask-inference
   pm2 save && pm2 startup
   ```

---

# 14. Deployment Option C — Railway / Render (Free Tier)

### Step 1: Deploy Flask to Railway
1. Create a new project on [railway.app](https://railway.app)
2. Connect your GitHub repo or upload the `inference-service/` folder
3. Set the start command: `python app.py`
4. Note the generated URL (e.g., `https://flask-pothole.up.railway.app`)

### Step 2: Deploy Express to Railway
1. Create another service for the `server/` folder
2. Add environment variables:
   - `FLASK_URL=https://flask-pothole.up.railway.app`
   - `MONGO_URI=mongodb+srv://...` (use MongoDB Atlas free tier)
3. Note the generated URL (e.g., `https://express-pothole.up.railway.app`)

### Step 3: Deploy Angular to Vercel/Netlify
1. Update `api.service.ts` to point to your Express Railway URL
2. Run `ng build` locally
3. Upload the `dist/client/browser` folder to Vercel or Netlify
4. Set the framework to "Other" and root to the dist folder

### Step 4: MongoDB Atlas (Free Tier)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free M0 cluster
3. Create a database user and whitelist `0.0.0.0/0`
4. Copy the connection string and set it as `MONGO_URI` in Express

---

# 15. Common Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `Port 5000 is in use` | macOS AirPlay Receiver uses port 5000 | We already use port `5001`. If 5001 is also taken, run `lsof -t -i:5001 \| xargs kill -9` |
| `EADDRINUSE: address already in use :::3000` | Express server is already running | Run `lsof -t -i:3000 \| xargs kill -9` then restart |
| `Failed to connect to inference service` | Express can't reach Flask | Ensure Flask is running on 5001. Check `FLASK_URL` in `routes/detect.js` |
| `ECONNREFUSED` when uploading | Express backend is not running | Start it with `cd server && npm run dev` |
| `zsh: command not found: npm` | Node.js not in PATH | Run `export PATH="/usr/local/bin:$PATH"` or reinstall Node.js |
| Angular build errors | Wrong Node version | Use Node.js v18 LTS (not odd-numbered versions) |
| Images not loading in History/Results | Flask service restarted, old images deleted | Images are stored in `inference-service/uploads/` and `results/`. Don't delete these folders |
| MongoDB connection failed | MongoDB not running | Start with `brew services start mongodb-community` (macOS) or `sudo systemctl start mongod` (Linux) |
