/**
 * Pothole Detection System - Express Server
 * Main entry point for the Node.js backend
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const detectRoutes = require('./routes/detect');
const citizenRoutes = require('./routes/citizen');
const roadhealthRoutes = require('./routes/roadhealth');
const repairRoutes = require('./routes/repair');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pothole-detection';

// Middleware
app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:4000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api', detectRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/road-health', roadhealthRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'pothole-detection-api',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (err.name === 'MulterError') {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Express server running on http://localhost:${PORT}`);
            console.log(`📡 Flask inference service expected at http://localhost:5000`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('Starting server without MongoDB...');
        app.listen(PORT, () => {
            console.log(`🚀 Express server running on http://localhost:${PORT} (No DB)`);
        });
    });

module.exports = app;
