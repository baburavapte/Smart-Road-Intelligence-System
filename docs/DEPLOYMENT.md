# 🚀 RoadSense AI — Comprehensive Production Deployment Guide

This guide details all procedures required to deploy the **Smart Pothole Detection & Predictive Road Health Management System** to production environments (Docker Compose, Linux Cloud VMs, PM2 process management, and Cloud PAAS platforms).

---

## 📋 System Prerequisites

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| **Node.js** | `v18.x`+ (LTS) | Express API Gateway & Angular CLI |
| **Python** | `v3.10`+ | Flask YOLOv8 Computer Vision Microservice |
| **MongoDB** | `v6.0`+ | NoSQL Primary Database with `2dsphere` spatial indexing |
| **Docker & Docker Compose** | `v24.x`+ / `v2.x`+ | Containerized multi-service orchestrations |
| **Nginx** | `v1.22`+ | High-performance Reverse Proxy & SSL Termination |

---

## 🛠️ Method 1: Docker Compose Deployment (Recommended)

The simplest, most reliable way to run the full stack (Frontend, Express Gateway, Flask Inference, MongoDB) is using the pre-configured Docker Compose pipeline.

### Step 1: Clone Repository & Create `.env`

```bash
# Clone the repository
git clone https://github.com/your-org/pothole-detection.git
cd pothole-detection

# Copy environment template for server
cp server/.env.example server/.env
```

### Step 2: Configure Environment Variables (`server/.env`)

```env
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb://mongodb:27017/pothole-detection
FLASK_URL=http://flask-inference:5001
JWT_SECRET=production-secure-32-character-random-secret-key
ADMIN_EMAIL=admin@smartcity.gov.in
ROADSENSE_API_KEY=your-mcp-server-api-key
```

### Step 3: Spin Up Containers

```bash
# Build and start all services in detached mode
docker compose up --build -d
```

### Step 4: Seed Database Inside Container

```bash
# Seed initial users, contractors, and geographic road monitoring zones
docker compose exec express-backend node scripts/seedUsers.js
docker compose exec express-backend node scripts/seedZones.js
docker compose exec express-backend node scripts/seedContractors.js
```

### Step 5: Verify Deployment

Access the application in your browser:
* **Web UI:** `http://localhost` (or `http://YOUR_SERVER_IP`)
* **Express Health Check:** `http://YOUR_SERVER_IP/api/health`
* **Flask Inference Check:** `http://YOUR_SERVER_IP:5001/health`

---

## 💻 Method 2: Linux Cloud Virtual Machine (Ubuntu 22.04 LTS / AWS EC2 / GCP)

### Step 1: Install Dependencies

```bash
# Update system repositories
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs python3 python3-pip python3-venv nginx mongodb pm2

# Verify installations
node -v
python3 --version
```

### Step 2: Set Up Python Inference Microservice

```bash
cd /var/www/pothole-detection/inference-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Set Up Node.js Backend API Gateway

```bash
cd /var/www/pothole-detection/server
npm install --production

# Run database seeds
node scripts/seedUsers.js
node scripts/seedZones.js
node scripts/seedContractors.js
```

### Step 4: Build Angular Production SPA

```bash
cd /var/www/pothole-detection/client
npm install
npm run build -- --configuration production

# Copy compiled assets to Nginx web root
sudo cp -r dist/client/browser/* /var/www/html/
```

### Step 5: Configure PM2 Process Manager

Start and configure system services to automatically launch on boot:

```bash
# Start Flask Microservice with PM2
pm2 start /var/www/pothole-detection/inference-service/app.py \
  --name "flask-inference" \
  --interpreter /var/www/pothole-detection/inference-service/venv/bin/python

# Start Express Gateway with PM2
pm2 start /var/www/pothole-detection/server/server.js \
  --name "express-gateway"

# Start MCP Server with PM2 (Optional)
pm2 start /var/www/pothole-detection/mcp-server.js \
  --name "mcp-server"

# Save process list and generate systemd startup script
pm2 save
pm2 startup
```

### Step 6: Configure Nginx & SSL Certbot

Create `/etc/nginx/sites-available/pothole-detection`:

```nginx
server {
    listen 80;
    server_name smartcity-roads.gov.in;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site configuration and issue HTTPS certificates:

```bash
sudo ln -s /etc/nginx/sites-available/pothole-detection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtain SSL Certificate via Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d smartcity-roads.gov.in
```

---

## 🔑 Default Production Credentials

After running the seed scripts, login with the pre-seeded credentials (ensure to update default passwords prior to public launch):

| Role | Login Identifier | Password | Access Level |
|---|---|---|---|
| **System Admin** | `admin@smartcity.gov.in` | `admin123` | Control Room, RBAC User Management, Audit Logs |
| **PWD Officer** | `OFFICER123` *(Officer ID)* | `officer123` | Status updates, Contractor assignments |
| **Contractor** | `contractor@buildwell.com` | `contractor123` | Work order view, Repair proof photo uploads |
| **Citizen** | Register at UI or `citizen@test.com` | `citizen123` | Public reporting, route safety queries |

---

## ⚙️ Maintenance & Logs Command Cheatsheet

| Task | Command |
|---|---|
| **View Express Logs** | `pm2 logs express-gateway` |
| **View Flask ML Logs** | `pm2 logs flask-inference` |
| **Docker Container Status** | `docker compose ps` |
| **Docker Live Logs** | `docker compose logs -f` |
| **Restart Docker Cluster** | `docker compose restart` |
| **MongoDB Backup** | `mongodump --db pothole-detection --out /backups/$(date +%F)` |

---

## ✅ Deployment Checklist

- [x] Generated strong `JWT_SECRET` (32+ characters)
- [x] Environment files (`.env`) created and excluded from VCS
- [x] Database seeded with initial users, zones, and contractors
- [x] Python virtual environment isolated with PyTorch + Ultralytics dependencies
- [x] Docker / PM2 service persistence configured for auto-restart
- [x] Nginx reverse proxy routing `/api/` traffic to Express and `/socket.io/` to WebSockets
- [x] SSL/TLS certificates configured for production domains

