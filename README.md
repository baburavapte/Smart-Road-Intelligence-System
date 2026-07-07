# Smart Pothole Detection & Road Health Management System
### MEAN Stack + YOLOv8 Deep Learning Microservice

This is a comprehensive, production-ready enterprise-grade web application designed to automatically detect road potholes using a deep learning Computer Vision model (YOLOv8) and manage road maintenance workflows. 

The system transitions traditional, manual, and reactive road inspection processes into a modern, automated, and predictive road health infrastructure management platform.

---

## 📸 Key Capabilities & Features

*   **Real-time AI Pothole Detection:** Leverages an optimized YOLOv8 deep learning model served via a Python Flask microservice to process uploaded imagery, localize potholes, draw colored bounding boxes, and automatically evaluate threat severity (None, Low, Medium, High, Critical).
*   **Citizen Reporting Portal:** Empowers citizens to report detected potholes, assign location tags, write descriptions, and track the live lifecycle stages (`reported`, `verified`, `assigned`, `in_progress`, `fixed`, `closed`) of their reports.
*   **Road Health Index (RHI) & Forecasting:** Groups detections by road zones to compute an aggregate Road Health Score (0-100). Uses **Simple Linear Regression** to forecast future road degradation trends over 30, 60, and 90 days.
*   **Repair Priority Algorithm:** Dynamically ranks road repair backlogs using a multi-criteria priority formula balancing average severity, citizen complaint volumes, current health score degradation, and historical frequencies.
*   **Route Safety Inspector:** Allows users to trace GPS route coordinates and query all historical pothole coordinates within a configurable radius to assess path safety.
*   **Government Admin Control Room:** Admin portal where municipal teams can review citizen complaints, update lifecycle stages, allocate teams, upload repair proofs (before/after photos), and verify fixes.
*   **Citizen Notification System:** Generates notifications matching report lifecycle shifts, keeping citizens informed via dynamic notification boxes in their dashboard.

---

## 🛠 Tech Stack & Architecture

```
                       ┌──────────────────────┐
                       │   Angular 17 SPA     │
                       │   (Client Portal)    │
                       └──────────┬───────────┘
                                  │ (HTTP REST)
                                  ▼
                       ┌──────────────────────┐
                       │   Express / Node.js  │
                       │   (Backend Gateway)  │
                       └────┬────────────┬────┘
                            │            │
          (Mongoose ODM)    │            │ (HTTP REST / Axios Proxy)
                            ▼            ▼
                     ┌──────────┐    ┌──────────────────────┐
                     │ MongoDB  │    │  Python Flask API    │
                     │ Database │    │  (YOLOv8 Inference)  │
                     └──────────┘    └──────────────────────┘
```

*   **Frontend SPA:** Angular 17, Component-driven Architecture, Reactive Forms, Chart.js for analytics, TailwindCSS & Vanilla CSS with custom glassmorphism components.
*   **API Gateway Backend:** Node.js, Express.js, Mongoose ODM, Multer for multipart media streaming.
*   **Inference Service:** Python 3.10+, PyTorch, Ultralytics YOLOv8, OpenCV, Flask.
*   **Database Engine:** MongoDB NoSQL database with geospatial indices (`2dsphere`).

---

## 🚀 Setup & Installation Instructions

To spin up the system, you must start the three logical services. Open three separate terminal windows.

### Service 1: Python Inference Service (Port 5001)
This service loads the YOLOv8 model (`best_weights.pt`) in memory.

```bash
# 1. Navigate to the inference service directory
cd inference-service

# 2. Create and activate a virtual environment
python3 -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the Flask microservice
python app.py
```
*(Confirms with: `[INFO] Loading YOLOv8 model...` and `Running on http://0.0.0.0:5001`)*

### Service 2: Node.js / Express Backend API (Port 3000)
Orchestrates database queries, hooks, and proxies binary image transfers.

```bash
# 1. Navigate to the server directory
cd server

# 2. Install dependencies
npm install

# 3. Create .env file with necessary variables
# Example: PORT=3000, MONGO_URI=mongodb://localhost:27017/pothole-detection, FLASK_URL=http://localhost:5001

# 4. Run development server
npm run dev
```
*(Confirms with: `Connected to MongoDB` and `Express server running on http://localhost:3000`)*

### Service 3: Angular Frontend client (Port 4200)
Presents the user dashboard, reporting tools, map layers, and admin workspace.

```bash
# 1. Navigate to the client directory
cd client

# 2. Install dependencies
npm install

# 3. Start development server
npm run start
```
*(Confirms with: `Angular Live Development Server is listening on localhost:4200`)*

---

## 📡 REST API Reference

The backend API Gateway exposes the following endpoints for client applications:

### Core Detections (`/api`)
| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/api/detect` | `POST` | `multipart/form-data` (image, lat, lng) | Upload image, run YOLO inference, save to DB |
| `/api/detections` | `GET` | Query params (`page`, `limit`) | Fetch list of historical detections |
| `/api/detections/:id` | `GET` | None | Fetch single detection details |
| `/api/detections/geojson`| `GET` | None | Fetch geolocated detections for map layers |
| `/api/detections/near-route`| `POST`| `coordinates` (array of `[lng, lat]`), `radius` | Find potholes along a route path |
| `/api/stats` | `GET` | None | Get aggregates, severity counters, and 7-day stats |
| `/api/detections/:id` | `DELETE`| None | Delete a detection record |

### Citizen Reports (`/api/citizen`)
| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/reports` | `POST` | `detectionId`, `reporterName`, `reporterEmail`, `description` | Submit report for a detection |
| `/reports` | `GET` | Query params (`email`, `lifecycle`, `page`, `limit`) | Fetch reported potholes with populate hooks |
| `/reports/stats` | `GET` | None | Lifecycle stats (reported, assigned, fixed, closed) |
| `/reports/:id` | `GET` | None | Fetch specific citizen report and historical stages |
| `/reports/:id/lifecycle`| `PATCH`| `lifecycle` (verified/assigned/fixed etc.), `assignedTeam` | Transition state (Govt. Admin only) |

### Road Health Metrics (`/api/road-health`)
| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/` | `GET` | None | Retrieve list of road zones and scores |
| `/geojson` | `GET` | None | Retrieve road boundary centers in GeoJSON format |
| `/priority` | `GET` | None | Priority ranking of road repairs |
| `/roads` | `POST` | `roadName`, `boundingBox` (lat/lng min/max constraints) | Define a new road monitoring zone |
| `/calculate` | `POST` | None | Re-evaluate health scores & severity aggregates |
| `/:id/forecast` | `GET` | None | 30/60/90 days linear regression health forecast |
| `/forecast/critical`| `GET` | None | Road zones predicted to fall critical soon |

### Maintenance & Repairs (`/api/repair`)
| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/` | `POST` | `multipart/form-data` (afterImage, repairNotes, repairTeam...) | Upload repair completion proof |
| `/` | `GET` | None | Fetch all repair records and populate links |
| `/by-report/:reportId` | `GET`| None | Retrieve repair proof by citizen report ID |
| `/:id/verify` | `PATCH`| `verified` (bool) | Verify repair completion status |

### Alerts & Notifications (`/api/notifications`)
| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/` | `GET` | Query param (`email`) | Get notifications logs for a specific user |
| `/unread-count` | `GET` | Query param (`email`) | Get unread notifications counts |
| `/:id/read` | `PATCH`| None | Mark specific notification as read |
| `/read-all` | `PATCH`| `email` | Mark all notifications for user as read |

---

## 🛡 License
This project is open-source and available under the MIT License.
