# 🛣️ Smart Pothole Detection & Road Health Management System
> **Enterprise-Grade Infrastructure Intelligence Platform**
> *MEAN Stack (MongoDB, Express, Angular 17, Node.js) + PyTorch YOLOv8 Computer Vision Microservice + Model Context Protocol (MCP) Integration*

[![Angular](https://img.shields.io/badge/Angular-17.3-DD0031?style=flat&logo=angular)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF?style=flat)](https://github.com/ultralytics/ultralytics)
[![MCP](https://img.shields.io/badge/MCP-Native_Node-FF6F00?style=flat)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

The **Smart Pothole Detection & Road Health Management System** is a production-grade, end-to-end web platform designed to transform manual and reactive road maintenance into automated, data-driven, and predictive urban infrastructure management. 

By unifying computer vision inference, interactive GIS geospatial mapping, dynamic priority ranking, predictive road degradation analytics, and a multi-role administrative workspace, the platform equips smart cities and municipal authorities to inspect, track, and remediate road hazards efficiently.

---

## 🌟 Key Features & Capabilities

### 🧠 1. Automated AI Pothole Detection (YOLOv8)
* **Real-time Computer Vision:** Processes high-resolution imagery via a Python Flask microservice serving custom-trained YOLOv8 PyTorch models.
* **Severity Assessment:** Automatically categorizes detected potholes into threat levels (`None`, `Low`, `Medium`, `High`, `Critical`) based on bounding box dimensions and surface ratio heuristics.
* **Annotated Imagery:** Generates visual output with highlighted bounding boxes, class labels, and confidence metrics saved for verification.
* **EXIF & Geospatial Parsing:** Automatically extracts GPS coordinates (`latitude`, `longitude`) from uploaded image metadata when available.

### 🗺️ 2. Geospatial GIS & Route Safety Inspector
* **Interactive Heatmaps & Clustering:** Visualizes pothole density, severity heatmaps, and clustered markers using **Leaflet.js**, **Leaflet.heat**, and **Leaflet.markercluster**.
* **Path & Route Safety Analysis:** Allows drivers and urban planners to draw or input multi-point GPS routes (`[lng, lat]`) to scan for potholes within a configurable radius along the path.
* **GeoJSON Monitoring Zones:** Evaluates spatial boundaries of designated road zones using MongoDB `2dsphere` spatial indexing.

### 👥 3. Citizen Reporting & Engagement Lifecycle
* **Public Reporting Portal:** Empowers citizens to report road hazards, attach geotagged images, add titles/descriptions, and receive live progress tracking.
* **6-Stage Workstream Lifecycle:** Tracks reports through structured state transitions:  
  `Reported` ➔ `Verified` ➔ `Assigned` ➔ `In Progress` ➔ `Fixed` ➔ `Closed`.
* **Public Feed & Transparency:** Displays recent public submissions to prevent redundant report filing.

### 📊 4. Road Health Index (RHI) & Predictive Analytics
* **Zone Health Score (0-100 RHI):** Dynamically computes an aggregate Road Health Index per road section using historical detection frequencies and severity weightings.
* **Linear Regression Forecasting:** Employs mathematical trend modeling to project future RHI degradation over **30, 60, and 90-day** horizons.
* **Automated Priority Ranking Algorithm:** Ranks repair backlogs by weighing average pothole severity, citizen complaint velocity, historical deterioration rates, and road criticality.
* **Critical Zone Alerts:** Identifies zones predicted to fall below safety thresholds to enable proactive preventive maintenance.

### 🏛️ 5. Municipal Control Room & Contractor Workspace
* **Role-Based Access Control (RBAC):** Distinct roles and views tailored for `Citizens`, `PWD Officers`, `Contractors`, and `System Admins`.
* **Contractor Dispatch & Work Orders:** Allows administrators to assign repair work orders directly to registered municipal contractors.
* **Before / After Verification:** Supports uploading repair completion photos and proof notes, triggering automated verification checks before closing tickets.
* **Exportable Reports:** Generates executive PDF summary reports using **jsPDF** and **jsPDF-AutoTable**.

### 🤖 6. Model Context Protocol (MCP) AI Integration
* **Native MCP Server (`mcp-server.js`):** Built-in zero-dependency Model Context Protocol server exposing project data and tools directly to AI assistants (e.g., Claude Desktop, Antigravity, Cursor, Custom Agents).
* **AI Tool Integration:** Enables AI agents to retrieve live pothole stats, query route safety, fetch high-priority road zones, and inspect lifecycle backlogs via standardized JSON-RPC 2.0 transport over `stdio`.

### 🔔 7. Real-Time Socket.io & Email Notifications
* **Live Socket.io Broadcasts:** Instantly pushes status changes and critical alerts across active admin and user sessions.
* **Nodemailer Alerts:** Sends email notifications to citizens when their submitted reports transition stages (e.g., when a pothole is assigned or fixed).

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────────────┐
                                  │      Angular 17 SPA Frontend      │
                                  │ (Dashboard, GIS Maps, Reporting)  │
                                  └─────────────────┬─────────────────┘
                                                    │
                                         HTTP / REST & WebSocket
                                                    │
                                                    ▼
                                  ┌───────────────────────────────────┐
                                  │     Node.js / Express Gateway     │
                                  │   (JWT Auth, Business Logic, DB)  │
                                  └─────────┬───────────────┬─────────┘
                                            │               │
                    Mongoose ODM (2dsphere) │               │ HTTP Axios Proxy
                                            ▼               ▼
                                 ┌──────────────┐       ┌──────────────────────┐
                                 │   MongoDB    │       │ Python Flask Service │
                                 │   Database   │       │ (YOLOv8 PyTorch ML)  │
                                 └──────────────┘       └──────────────────────┘
                                            ▲
                                            │ Local Storage / REST API
                                            │
                                 ┌──────────┴───────────┐
                                 │   MCP Server (stdio) │
                                 │ (AI Assistant Tools) │
                                 └──────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technologies & Libraries |
|---|---|
| **Frontend SPA** | Angular 17.3, RxJS 7.8, Leaflet 1.9, Chart.js 4.5, TailwindCSS, Vanilla CSS |
| **Backend API Gateway** | Node.js (v18+), Express 4.18, Mongoose 8.1, Socket.io 4.8, Multer 1.4, JWT, Nodemailer |
| **ML Inference Service** | Python 3.10+, PyTorch, Ultralytics YOLOv8, OpenCV 4.x, Flask 3.0, Flask-CORS |
| **Database & GIS** | MongoDB 6.0+ with `2dsphere` geospatial indices |
| **Protocol / Extensions** | Model Context Protocol (MCP) via Native Node.js `stdio` JSON-RPC |
| **PDF Generation** | jsPDF 4.2, jsPDF-AutoTable 5.0 |

---

## 📁 Repository Structure

```
Pothole_Detection_Project/
├── client/                     # Angular 17 Frontend Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Admin, Citizen, Detect, GIS Map, Road Health components
│   │   │   ├── guards/         # Auth & Role-based Access Route Guards
│   │   │   ├── interceptors/   # HTTP JWT Auth Interceptors
│   │   │   └── services/       # Api, Auth, Socket, Toast, & GIS Map Services
│   │   └── styles.css          # Core Design System & Glassmorphic CSS Styling
│   └── package.json
├── server/                     # Node.js / Express API Gateway
│   ├── config/                 # DB Connection & Configuration Settings
│   ├── middleware/             # Auth, Upload, Validation & Rate Limiting Middleware
│   ├── models/                 # Mongoose Schemas (User, Detection, Report, RoadHealth, Repair)
│   ├── routes/                 # Express API Endpoint Routes
│   ├── scripts/                # Database Seeding Scripts (seedUsers, seedZones, seedContractors)
│   ├── services/               # RHI Calculator & Forecasting Engines
│   ├── uploads/                # Local Upload Directory for Raw & Processed Images
│   ├── server.js               # Main Express Gateway Entry Point
│   ├── .env.example            # Environment Configuration Template
│   └── package.json
├── inference-service/          # Python Flask YOLOv8 Inference Microservice
│   ├── models/                 # YOLOv8 Trained Weights (`best_weights.pt`)
│   ├── uploads/                # Temporary Upload Storage for Inference
│   ├── results/                # Annotated Output Images with Bounding Boxes
│   ├── app.py                  # Flask REST Server & Model Loader
│   └── requirements.txt        # Python Dependencies
├── mcp-server.js               # Model Context Protocol (MCP) Server for AI Agents
├── pothole_sample.jpg          # Sample Image for Testing Inference
├── Deployment_Guide.md         # Production Deployment & Hosting Instructions
├── Project_Report.md           # Technical Architecture & System Documentation
└── README.md                   # Project Documentation
```

---

## ⚡ Setup & Installation Guide

### Prerequisites
Before starting, ensure you have the following installed on your machine:
* **Node.js**: `v18.x` or higher
* **npm**: `v9.x` or higher
* **Python**: `3.10.x` or `3.11.x`
* **MongoDB**: `v6.0` or higher (Running locally on `mongodb://localhost:27017` or MongoDB Atlas URI)
* **Git**

---

### Step 1: Environment Configuration

Create a `.env` file inside the `server/` directory based on `.env.example`:

```bash
cd server
cp .env.example .env
```

Set the values inside `server/.env`:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/pothole-detection
JWT_SECRET=super-secret-random-key-32-chars-long
FLASK_URL=http://localhost:5001
ROADSENSE_API_KEY=your-mcp-server-api-key
ADMIN_EMAIL=admin@smartcity.gov.in
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

### Step 2: Start Service 1 — Python Inference Service (Port 5001)

The Flask microservice loads the YOLOv8 PyTorch model weights into memory.

```bash
# 1. Navigate to inference-service
cd inference-service

# 2. Create and activate a Python virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Launch Flask Microservice
python app.py
```
> **Console Output:**  
> `[INFO] Loading YOLOv8 model from .../models/best_weights.pt...`  
> `[INFO] Model loaded successfully!`  
> `* Running on http://127.0.0.1:5001`

---

### Step 3: Start Service 2 — Express API Gateway & Seed DB (Port 3000)

Open a **new terminal window**:

```bash
# 1. Navigate to server
cd server

# 2. Install dependencies
npm install

# 3. Seed initial database records (Users, Road Zones, Contractors)
node scripts/seedUsers.js
node scripts/seedZones.js
node scripts/seedContractors.js

# 4. Start the Express Gateway
npm run dev
```
> **Console Output:**  
> `Connected to MongoDB: mongodb://localhost:27017/pothole-detection`  
> `Express server running on http://localhost:3000`

---

### Step 4: Start Service 3 — Angular 17 Frontend (Port 4200)

Open a **third terminal window**:

```bash
# 1. Navigate to client
cd client

# 2. Install dependencies
npm install

# 3. Start Angular Development Server
npm run start
```
> **Access Web Application:** Open your browser and navigate to `http://localhost:4200`

---

### Step 5: (Optional) Model Context Protocol (MCP) AI Server

To expose system insights to AI assistants, open a **fourth terminal window**:

```bash
node mcp-server.js
```

---

## 🔑 Pre-Configured Demo Accounts

After running the seed scripts in Step 3, use the following credentials to test role-based capabilities:

| Role | Email / Officer ID | Password | Access Level / Capabilities |
|---|---|---|---|
| **System Admin** | `admin@smartcity.gov.in` | `admin123` | Full access, control room, user management, audit logs |
| **PWD Officer** | `OFFICER123` *(Officer ID)* | `officer123` | Lifecycle status update, contractor work assignment |
| **Contractor** | `contractor@buildwell.com` | `contractor123` | View assigned work orders, upload completion proofs |
| **Citizen** | `citizen@test.com` | `citizen123` | Report potholes, track status, view notifications |

---

## 📡 Comprehensive REST API Reference

The backend Express server exposes standard RESTful endpoints under `/api`:

### 🔐 1. Authentication & Users (`/api/auth`, `/api/users`)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register a new Citizen account |
| `/api/auth/login` | `POST` | Public | Login with email/officer ID & password, returns JWT |
| `/api/auth/me` | `GET` | JWT | Get current authenticated user profile |
| `/api/users` | `GET` | Admin | Fetch all registered users in the system |

### 📷 2. AI Detections (`/api/detect`, `/api/detections`)
| Endpoint | Method | Auth | Payload / Params | Description |
|---|---|---|---|
| `/api/detect` | `POST` | Optional | `multipart/form-data` (`image`, `lat`, `lng`) | Upload image, invoke YOLOv8, store detection |
| `/api/detections` | `GET` | Public | Query: `page`, `limit`, `severity` | Fetch paginated detection records |
| `/api/detections/:id` | `GET` | Public | Path: `id` | Get details of a single detection |
| `/api/detections/geojson` | `GET` | Public | None | Retrieve all detections formatted as GeoJSON |
| `/api/detections/near-route` | `POST` | Public | `{ coordinates: [[lng, lat]], radius: 500 }` | Find detected potholes along a spatial route path |
| `/api/detections/:id` | `DELETE` | Admin | Path: `id` | Delete a specific detection record |

### 📝 3. Citizen Reports (`/api/citizen`)
| Endpoint | Method | Auth | Payload / Params | Description |
|---|---|---|---|
| `/api/citizen/reports` | `POST` | Public | `{ detectionId, reporterName, description }` | Submit a report for a detected pothole |
| `/api/citizen/reports` | `GET` | Public | Query: `email`, `lifecycle`, `page` | Fetch citizen report feed |
| `/api/citizen/reports/stats` | `GET` | Public | None | Get report counts grouped by lifecycle status |
| `/api/citizen/reports/:id` | `GET` | Public | Path: `id` | Get details and timeline for a specific report |
| `/api/citizen/reports/:id/lifecycle` | `PATCH` | Admin/Officer | `{ lifecycle, assignedTeam }` | Transition report state (`verified`, `assigned`, etc.) |

### 📊 4. Road Health & Predictive AI (`/api/road-health`)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/road-health` | `GET` | Public | Fetch monitoring zones and Road Health Index (RHI) scores |
| `/api/road-health/geojson` | `GET` | Public | Get road monitoring zones as GeoJSON polygons |
| `/api/road-health/priority` | `GET` | Public | Fetch repair priority ranking based on weighted algorithm |
| `/api/road-health/roads` | `POST` | Admin | Define a new road zone with bounding box coordinates |
| `/api/road-health/calculate` | `POST` | Admin | Trigger system-wide recalculation of RHI and severity weights |
| `/api/road-health/:id/forecast` | `GET` | Public | Fetch 30/60/90-day degradation forecast via Linear Regression |
| `/api/road-health/forecast/critical` | `GET` | Public | List road zones predicted to enter critical failure state soon |

### 🛠️ 5. Repairs & Contractors (`/api/repair`, `/api/contractors`)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/repair` | `POST` | Contractor | Upload repair completion proof (`afterImage`, notes) |
| `/api/repair` | `GET` | Public | List all completed repair records |
| `/api/repair/by-report/:reportId` | `GET` | Public | Retrieve repair proof by citizen report ID |
| `/api/repair/:id/verify` | `PATCH` | Admin/Officer | Verify contractor repair work and mark ticket resolved |

### 🔔 6. Notifications & Audit (`/api/notifications`, `/api/audit`)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/notifications` | `GET` | JWT | Fetch notification feed for logged-in user |
| `/api/notifications/unread-count` | `GET` | JWT | Get count of unread user notifications |
| `/api/notifications/:id/read` | `PATCH` | JWT | Mark a specific notification as read |
| `/api/audit` | `GET` | Admin | Retrieve administrative audit log history |

---

## 🤖 Model Context Protocol (MCP) Server Integration

The repository includes a custom Model Context Protocol server (`mcp-server.js`) that allows AI models (such as Claude Desktop, Gemini, Antigravity, or Cursor) to interact directly with the Pothole Detection System.

### Available MCP Tools Exposed

1. `get_pothole_stats`: Retrieves high-level counters (total potholes detected, repaired, critical, pending).
2. `get_potholes_near_route`: Accepts an array of GPS coordinates and scans for nearby road hazards.
3. `get_priority_repair_backlog`: Fetches top-priority road repairs ordered by deterioration and complaint impact.
4. `get_road_health_forecast`: Retrieves 30, 60, and 90-day RHI trend forecasts for specific road monitoring zones.

### Adding to Claude Desktop or MCP Client Configuration

Add the following to your `claude_desktop_config.json` or MCP settings:

```json
{
  "mcpServers": {
    "roadsense-pothole-detection": {
      "command": "node",
      "args": ["/path/to/Pothole_Detection_Project/mcp-server.js"],
      "env": {
        "ROADSENSE_API_KEY": "your-mcp-server-api-key"
      }
    }
  }
}
```

---

## 🧪 Testing & Verification

### Running Frontend Tests
```bash
cd client
npm run test
```

### Testing ML Inference Microservice
```bash
curl -X GET http://localhost:5001/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2026-07-28T18:10:00.000Z"
}
```

### Sample Image Detection Test
```bash
curl -X POST http://localhost:5001/detect \
  -F "image=@pothole_sample.jpg"
```

---

## 📖 Additional Documentation

For deep-dive guides, refer to the included documentation files:
* 📄 **[Project_Report.md](file:///c:/Users/dhruv/Downloads/Pothole_Detection_Project/Project_Report.md):** Complete architectural design, mathematical model formulas, data flow diagrams, and schema definitions.
* 🚀 **[Deployment_Guide.md](file:///c:/Users/dhruv/Downloads/Pothole_Detection_Project/Deployment_Guide.md):** Production deployment strategies covering Nginx reverse proxying, Docker containerization, PM2 process management, and SSL setup.

---

## 📄 License
This project is open-source software licensed under the **MIT License**.

