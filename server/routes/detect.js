/**
 * RoadSense AI — Detection Routes
 * Smart Road Intelligence & Pothole Detection System
 *
 * YOLO inference is handled by:
 * Hugging Face Spaces / Gradio ZeroGPU
 *
 * Express handles:
 * - Image upload
 * - Hugging Face inference request
 * - Saving annotated image
 * - MongoDB detection records
 * - Detection APIs
 * - Admin APIs
 * - Citizen report APIs
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const Detection = require('../models/Detection');
const authenticate = require('../middleware/auth');

// ============================================================
// CONFIGURATION
// ============================================================

const HF_SPACE = 'ArtistD/roadsense-yolo';

const SERVER_URL =
    process.env.SERVER_URL || 'http://localhost:3000';

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 50 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp',
            'image/bmp'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    'Invalid file type. Only JPEG, PNG, WebP, and BMP are allowed.'
                )
            );
        }
    }
});

// ============================================================
// HELPER — SAVE ANNOTATED IMAGE
// ============================================================

async function saveAnnotatedImage(fileData, outputPath) {

    if (!fileData) {
        throw new Error(
            'Hugging Face did not return an annotated image.'
        );
    }

    let imageUrl = null;

    // Gradio FileData object
    if (typeof fileData === 'object') {
        imageUrl =
            fileData.url ||
            null;

        // Some Gradio responses may provide a direct path.
        if (!imageUrl && fileData.path) {
            imageUrl = fileData.path;
        }

        // Some responses may provide a name.
        if (!imageUrl && fileData.name) {
            imageUrl = fileData.name;
        }
    }

    // Direct URL/string
    if (typeof fileData === 'string') {
        imageUrl = fileData;
    }

    if (!imageUrl) {
        throw new Error(
            'Unable to determine annotated image URL from Hugging Face response.'
        );
    }

    console.log('Annotated image reference:', imageUrl);

    // --------------------------------------------------------
    // Remote URL
    // --------------------------------------------------------

    if (
        typeof imageUrl === 'string' &&
        (
            imageUrl.startsWith('http://') ||
            imageUrl.startsWith('https://')
        )
    ) {

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        fs.writeFileSync(outputPath, response.data);

        return;
    }

    // --------------------------------------------------------
    // Local file path
    // --------------------------------------------------------

    if (
        typeof imageUrl === 'string' &&
        fs.existsSync(imageUrl)
    ) {

        fs.copyFileSync(
            imageUrl,
            outputPath
        );

        return;
    }

    throw new Error(
        `Unable to download annotated image. Returned path: ${imageUrl}`
    );
}

// ============================================================
// HELPER — EXTRACT POTHOLE COUNT
// ============================================================

function extractPotholeCount(resultText) {

    if (typeof resultText === 'number') {
        return resultText;
    }

    if (!resultText) {
        return 0;
    }

    const text = String(resultText);

    const match = text.match(
        /Potholes detected:\s*(\d+)/i
    );

    if (match) {
        return parseInt(match[1], 10);
    }

    const numberMatch = text.match(/\d+/);

    if (numberMatch) {
        return parseInt(
            numberMatch[0],
            10
        );
    }

    return 0;
}

// ============================================================
// HELPER — CREATE ANNOTATED FILENAME
// ============================================================

function createAnnotatedFilename(originalFilename) {

    const ext =
        path.extname(originalFilename) || '.jpg';

    return `annotated-${Date.now()}${ext}`;
}

// ============================================================
// POST /api/detect
// ============================================================

router.post(
    '/detect',
    upload.single('image'),
    async (req, res) => {

        try {

            // ------------------------------------------------
            // Validate upload
            // ------------------------------------------------

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    error: 'No image file provided'
                });
            }

            console.log(
                '=========================================='
            );

            console.log(
                'Starting Hugging Face pothole detection'
            );

            console.log(
                'Space:',
                HF_SPACE
            );

            console.log(
                'File:',
                req.file.originalname
            );

            console.log(
                'Local file:',
                req.file.path
            );

            console.log(
                '=========================================='
            );

            // ------------------------------------------------
            // Dynamically import Gradio client
            // ------------------------------------------------

            const {
                Client,
                handle_file
            } = await import('@gradio/client');

            // ------------------------------------------------
            // Connect to Hugging Face
            // ------------------------------------------------

            console.log(
                'Connecting to Hugging Face...'
            );

            const client =
                await Client.connect(HF_SPACE, {
                    token: process.env.HF_TOKEN
                });

            console.log(
                'Connected to Hugging Face.'
            );

            // ------------------------------------------------
            // Send image
            // ------------------------------------------------

            console.log(
                'Sending image to /detect_potholes...'
            );

            const hfResponse =
                await client.predict(
                    '/detect_potholes',
                    {
                        image: handle_file(
                            req.file.path
                        )
                    }
                );

            console.log(
                'Hugging Face response received.'
            );

            console.log(
                'Raw HF response:',
                JSON.stringify(
                    hfResponse,
                    null,
                    2
                )
            );

            // ------------------------------------------------
            // Extract Gradio response
            //
            // [0] = annotated image
            // [1] = result text
            // ------------------------------------------------

            const responseData =
                hfResponse?.data || [];

            const annotatedFile =
                responseData[0];

            const resultText =
                responseData[1];

            console.log(
                'HF result text:',
                resultText
            );

            console.log(
                'HF annotated file:',
                annotatedFile
            );

            // ------------------------------------------------
            // Validate HF result
            // ------------------------------------------------

            if (!annotatedFile) {

                throw new Error(
                    'Hugging Face returned no annotated image.'
                );
            }

            // ------------------------------------------------
            // Extract pothole count
            // ------------------------------------------------

            const potholeCount =
                extractPotholeCount(
                    resultText
                );

            console.log(
                'Potholes detected:',
                potholeCount
            );

            // ------------------------------------------------
            // Create results directory
            // ------------------------------------------------

            const resultsDir =
                path.join(
                    __dirname,
                    '..',
                    'results'
                );

            if (!fs.existsSync(resultsDir)) {

                fs.mkdirSync(
                    resultsDir,
                    {
                        recursive: true
                    }
                );
            }

            // ------------------------------------------------
            // Create annotated filename
            // ------------------------------------------------

            const annotatedFilename =
                createAnnotatedFilename(
                    req.file.originalname
                );

            const annotatedPath =
                path.join(
                    resultsDir,
                    annotatedFilename
                );

            // ------------------------------------------------
            // Save annotated image
            // ------------------------------------------------

            await saveAnnotatedImage(
                annotatedFile,
                annotatedPath
            );

            console.log(
                'Annotated image saved:',
                annotatedFilename
            );

            // ------------------------------------------------
            // Detection metadata
            //
            // Current HF Space returns only:
            // 1. Annotated image
            // 2. Pothole count text
            //
            // Therefore bounding boxes are not returned
            // separately.
            // ------------------------------------------------

            const detections = [];

            // ------------------------------------------------
            // Create MongoDB detection document
            // ------------------------------------------------

            const detection =
                new Detection({

                    fileId:
                        path.basename(
                            req.file.filename
                        ),

                    originalImage:
                        req.file.filename,

                    annotatedImage:
                        annotatedFilename,

                    originalFilename:
                        req.file.originalname,

                    imageDimensions: {},

                    potholeCount:
                        potholeCount,

                    detections:
                        detections,

                    status:
                        'completed'
                });

            // ------------------------------------------------
            // Location
            // ------------------------------------------------

            if (
                req.body.latitude &&
                req.body.longitude
            ) {

                const latitude =
                    parseFloat(
                        req.body.latitude
                    );

                const longitude =
                    parseFloat(
                        req.body.longitude
                    );

                if (
                    Number.isFinite(latitude) &&
                    Number.isFinite(longitude)
                ) {

                    detection.location = {

                        type: 'Point',

                        coordinates: [
                            longitude,
                            latitude
                        ]
                    };
                }
            }

            // ------------------------------------------------
            // Save MongoDB record
            // ------------------------------------------------

            await detection.save();

            console.log(
                'Detection saved to MongoDB:',
                detection._id
            );

            // ------------------------------------------------
            // Build image URLs
            // ------------------------------------------------

            const baseUrl =
                SERVER_URL.replace(
                    /\/+$/,
                    ''
                );

            const originalImageUrl =
                `${baseUrl}/uploads/${encodeURIComponent(
                    detection.originalImage
                )}`;

            const annotatedImageUrl =
                `${baseUrl}/results/${encodeURIComponent(
                    detection.annotatedImage
                )}`;

            // ------------------------------------------------
            // Response
            // ------------------------------------------------

            res.json({

                success: true,

                detection: {

                    id:
                        detection._id,

                    fileId:
                        detection.fileId,

                    originalImage:
                        originalImageUrl,

                    annotatedImage:
                        annotatedImageUrl,

                    originalFilename:
                        detection.originalFilename,

                    potholeCount:
                        detection.potholeCount,

                    severity:
                        detection.severity,

                    detections:
                        detection.detections,

                    imageDimensions:
                        detection.imageDimensions,

                    createdAt:
                        detection.createdAt
                }
            });

            // ------------------------------------------------
            // Cleanup uploaded file
            // ------------------------------------------------

            fs.unlink(
                req.file.path,
                (unlinkError) => {

                    if (unlinkError) {

                        console.error(
                            'Temporary file cleanup error:',
                            unlinkError.message
                        );
                    }
                }
            );

        } catch (error) {

            console.error(
                '========== DETECTION ERROR =========='
            );

            console.error(
                'Message:',
                error.message
            );

            console.error(
                'Stack:',
                error.stack
            );

            console.error(
                '===================================='
            );

            // ------------------------------------------------
            // Cleanup failed upload
            // ------------------------------------------------

            if (
                req.file &&
                req.file.path &&
                fs.existsSync(req.file.path)
            ) {

                fs.unlink(
                    req.file.path,
                    () => { }
                );
            }

            return res.status(500).json({

                success: false,

                error:
                    error.message ||
                    'Pothole detection failed.'
            });
        }
    }
);

// ============================================================
// GET /api/detections
// ============================================================

router.get(
    '/detections',
    async (req, res) => {

        try {

            const page =
                parseInt(req.query.page) || 1;

            const limit =
                parseInt(req.query.limit) || 20;

            const skip =
                (page - 1) * limit;

            const total =
                await Detection.countDocuments();

            const detections =
                await Detection.find()
                    .sort({
                        createdAt: -1
                    })
                    .skip(skip)
                    .limit(limit)
                    .lean();

            const formattedDetections =
                detections.map(
                    d => ({

                        id:
                            d._id,

                        fileId:
                            d.fileId,

                        originalImage:
                            `${SERVER_URL}/uploads/${encodeURIComponent(
                                d.originalImage
                            )}`,

                        annotatedImage:
                            `${SERVER_URL}/results/${encodeURIComponent(
                                d.annotatedImage
                            )}`,

                        originalFilename:
                            d.originalFilename,

                        potholeCount:
                            d.potholeCount,

                        severity:
                            d.severity,

                        detections:
                            d.detections,

                        imageDimensions:
                            d.imageDimensions,

                        createdAt:
                            d.createdAt
                    })
                );

            res.json({

                success: true,

                data:
                    formattedDetections,

                pagination: {

                    page,

                    limit,

                    total,

                    totalPages:
                        Math.ceil(
                            total / limit
                        )
                }
            });

        } catch (error) {

            console.error(
                'Fetch detections error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to fetch detections'
            });
        }
    }
);

// ============================================================
// GET /api/detections/geojson
// ============================================================

router.get(
    '/detections/geojson',
    async (req, res) => {

        try {

            const detections =
                await Detection.find({

                    location: {
                        $exists: true,
                        $ne: null
                    },

                    'location.coordinates': {
                        $exists: true
                    }

                })
                    .sort({
                        createdAt: -1
                    })
                    .lean();

            const features =
                detections.map(
                    d => ({

                        type: 'Feature',

                        geometry:
                            d.location,

                        properties: {

                            id:
                                d._id,

                            fileId:
                                d.fileId,

                            severity:
                                d.severity,

                            potholeCount:
                                d.potholeCount,

                            originalFilename:
                                d.originalFilename,

                            annotatedImage:
                                `${SERVER_URL}/results/${encodeURIComponent(
                                    d.annotatedImage
                                )}`,

                            createdAt:
                                d.createdAt
                        }
                    })
                );

            res.json({

                type:
                    'FeatureCollection',

                features
            });

        } catch (error) {

            console.error(
                'GeoJSON fetch error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    error.message
            });
        }
    }
);

// ============================================================
// GET /api/detections/:id
// ============================================================

router.get(
    '/detections/:id',
    async (req, res) => {

        try {

            const detection =
                await Detection.findById(
                    req.params.id
                ).lean();

            if (!detection) {

                return res.status(404).json({

                    success: false,

                    error:
                        'Detection not found'
                });
            }

            res.json({

                success: true,

                detection: {

                    id:
                        detection._id,

                    fileId:
                        detection.fileId,

                    originalImage:
                        `${SERVER_URL}/uploads/${encodeURIComponent(
                            detection.originalImage
                        )}`,

                    annotatedImage:
                        `${SERVER_URL}/results/${encodeURIComponent(
                            detection.annotatedImage
                        )}`,

                    originalFilename:
                        detection.originalFilename,

                    potholeCount:
                        detection.potholeCount,

                    severity:
                        detection.severity,

                    detections:
                        detection.detections,

                    imageDimensions:
                        detection.imageDimensions,

                    createdAt:
                        detection.createdAt
                }
            });

        } catch (error) {

            console.error(
                'Fetch detection error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to fetch detection'
            });
        }
    }
);

// ============================================================
// GET /api/stats
// ============================================================

router.get(
    '/stats',
    async (req, res) => {

        try {

            const totalDetections =
                await Detection.countDocuments();

            const totalPotholes =
                await Detection.aggregate([

                    {
                        $group: {

                            _id: null,

                            total: {
                                $sum:
                                    '$potholeCount'
                            }
                        }
                    }
                ]);

            const severityDistribution =
                await Detection.aggregate([

                    {
                        $group: {

                            _id:
                                '$severity',

                            count: {
                                $sum: 1
                            }
                        }
                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }
                ]);

            const recentDetections =
                await Detection.find()
                    .sort({
                        createdAt: -1
                    })
                    .limit(5)
                    .lean();

            const avgPotholes =
                totalDetections > 0
                    ? (
                        totalPotholes[0]?.total ||
                        0
                    ) / totalDetections
                    : 0;

            const sevenDaysAgo =
                new Date();

            sevenDaysAgo.setDate(
                sevenDaysAgo.getDate() - 7
            );

            const dailyDetections =
                await Detection.aggregate([

                    {
                        $match: {

                            createdAt: {
                                $gte:
                                    sevenDaysAgo
                            }
                        }
                    },

                    {
                        $group: {

                            _id: {

                                $dateToString: {

                                    format:
                                        '%Y-%m-%d',

                                    date:
                                        '$createdAt'
                                }
                            },

                            count: {
                                $sum: 1
                            },

                            potholes: {
                                $sum:
                                    '$potholeCount'
                            }
                        }
                    },

                    {
                        $sort: {
                            _id: 1
                        }
                    }
                ]);

            res.json({

                success: true,

                stats: {

                    totalDetections,

                    totalPotholes:
                        totalPotholes[0]?.total ||
                        0,

                    avgPotholesPerImage:
                        Math.round(
                            avgPotholes * 100
                        ) / 100,

                    severityDistribution:
                        severityDistribution.reduce(
                            (acc, s) => {

                                acc[s._id] =
                                    s.count;

                                return acc;

                            },
                            {}
                        ),

                    dailyDetections,

                    recentDetections:
                        recentDetections.map(
                            d => ({

                                id:
                                    d._id,

                                originalFilename:
                                    d.originalFilename,

                                potholeCount:
                                    d.potholeCount,

                                severity:
                                    d.severity,

                                annotatedImage:
                                    `${SERVER_URL}/results/${encodeURIComponent(
                                        d.annotatedImage
                                    )}`,

                                createdAt:
                                    d.createdAt
                            })
                        )
                }
            });

        } catch (error) {

            console.error(
                'Stats error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to fetch stats'
            });
        }
    }
);

// ============================================================
// POST /api/detections/near-route
// ============================================================

router.post(
    '/detections/near-route',
    async (req, res) => {

        try {

            const {
                coordinates,
                radius = 500
            } = req.body;

            if (
                !coordinates ||
                !Array.isArray(coordinates) ||
                coordinates.length < 2
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        'Invalid coordinates array. Provide at least 2 [lng, lat] pairs.'
                });
            }

            const radiusInRadians =
                radius / 6378100;

            const uniqueIds =
                new Set();

            const nearbyPotholes =
                [];

            const sampleRate =
                Math.max(
                    1,
                    Math.floor(
                        coordinates.length / 25
                    )
                );

            const sampledCoords =
                coordinates.filter(
                    (_, i) =>
                        i === 0 ||
                        i === coordinates.length - 1 ||
                        i % sampleRate === 0
                );

            for (
                const coord of sampledCoords
            ) {

                const potholes =
                    await Detection.find({

                        location: {

                            $geoWithin: {

                                $centerSphere: [
                                    coord,
                                    radiusInRadians
                                ]
                            }
                        }

                    }).lean();

                potholes.forEach(
                    p => {

                        const id =
                            p._id.toString();

                        if (
                            !uniqueIds.has(id)
                        ) {

                            uniqueIds.add(id);

                            nearbyPotholes.push(
                                p
                            );
                        }
                    }
                );
            }

            const formatted =
                nearbyPotholes.map(
                    d => ({

                        id:
                            d._id,

                        severity:
                            d.severity,

                        potholeCount:
                            d.potholeCount,

                        location:
                            d.location,

                        originalFilename:
                            d.originalFilename,

                        annotatedImage:
                            `${SERVER_URL}/results/${encodeURIComponent(
                                d.annotatedImage
                            )}`,

                        createdAt:
                            d.createdAt
                    })
                );

            res.json({

                success: true,

                data:
                    formatted,

                total:
                    formatted.length
            });

        } catch (error) {

            console.error(
                'Near-route error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to find potholes near route'
            });
        }
    }
);

// ============================================================
// PATCH /api/detections/:id/status
// ============================================================

router.patch(
    '/detections/:id/status',
    authenticate,
    async (req, res) => {

        try {

            const {
                reportStatus
            } = req.body;

            const validStatuses = [

                'reported',

                'under_review',

                'in_progress',

                'fixed'
            ];

            if (
                !reportStatus ||
                !validStatuses.includes(
                    reportStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const detection =
                await Detection.findByIdAndUpdate(

                    req.params.id,

                    {
                        reportStatus
                    },

                    {
                        new: true
                    }
                );

            if (!detection) {

                return res.status(404).json({

                    success: false,

                    error:
                        'Detection not found'
                });
            }

            res.json({

                success: true,

                detection: {

                    id:
                        detection._id,

                    reportStatus:
                        detection.reportStatus
                }
            });

        } catch (error) {

            console.error(
                'Status update error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to update report status'
            });
        }
    }
);

// ============================================================
// ADMIN STATS
// ============================================================

router.get(
    '/admin/stats',
    authenticate,
    async (req, res) => {

        try {

            const totalReports =
                await Detection.countDocuments();

            const statusCounts =
                await Detection.aggregate([

                    {
                        $group: {

                            _id:
                                '$reportStatus',

                            count: {
                                $sum: 1
                            }
                        }
                    }
                ]);

            const severityCounts =
                await Detection.aggregate([

                    {
                        $group: {

                            _id:
                                '$severity',

                            count: {
                                $sum: 1
                            }
                        }
                    }
                ]);

            const criticalCount =
                await Detection.countDocuments({

                    severity: {

                        $in: [
                            'critical',
                            'high'
                        ]
                    }
                });

            const fixedCount =
                await Detection.countDocuments({
                    reportStatus: 'fixed'
                });

            const pendingCount =
                await Detection.countDocuments({

                    reportStatus: {

                        $in: [
                            'reported',
                            'under_review',
                            'in_progress',
                            null
                        ]
                    }
                });

            res.json({

                success: true,

                stats: {

                    totalReports,

                    fixedReports:
                        fixedCount,

                    pendingReports:
                        pendingCount,

                    criticalPotholes:
                        criticalCount,

                    statusDistribution:
                        statusCounts.reduce(
                            (acc, s) => {

                                acc[
                                    s._id ||
                                    'reported'
                                ] = s.count;

                                return acc;

                            },
                            {}
                        ),

                    severityDistribution:
                        severityCounts.reduce(
                            (acc, s) => {

                                acc[s._id] =
                                    s.count;

                                return acc;

                            },
                            {}
                        )
                }
            });

        } catch (error) {

            console.error(
                'Admin stats error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to fetch admin stats'
            });
        }
    }
);

// ============================================================
// ADMIN DETECTIONS
// ============================================================

router.get(
    '/admin/detections',
    authenticate,
    async (req, res) => {

        try {

            const page =
                parseInt(req.query.page) || 1;

            const limit =
                parseInt(req.query.limit) || 20;

            const skip =
                (page - 1) * limit;

            const filter = {};

            if (req.query.status) {

                filter.reportStatus =
                    req.query.status;
            }

            if (req.query.severity) {

                filter.severity =
                    req.query.severity;
            }

            if (
                req.query.dateFrom ||
                req.query.dateTo
            ) {

                filter.createdAt = {};

                if (req.query.dateFrom) {

                    filter.createdAt.$gte =
                        new Date(
                            req.query.dateFrom
                        );
                }

                if (req.query.dateTo) {

                    const dateTo =
                        new Date(
                            req.query.dateTo
                        );

                    dateTo.setHours(
                        23,
                        59,
                        59,
                        999
                    );

                    filter.createdAt.$lte =
                        dateTo;
                }
            }

            const total =
                await Detection.countDocuments(
                    filter
                );

            const detections =
                await Detection.find(
                    filter
                )
                    .sort({
                        createdAt: -1
                    })
                    .skip(skip)
                    .limit(limit)
                    .lean();

            const formatted =
                detections.map(
                    d => ({

                        id:
                            d._id,

                        fileId:
                            d.fileId,

                        originalImage:
                            `${SERVER_URL}/uploads/${encodeURIComponent(
                                d.originalImage
                            )}`,

                        annotatedImage:
                            `${SERVER_URL}/results/${encodeURIComponent(
                                d.annotatedImage
                            )}`,

                        originalFilename:
                            d.originalFilename,

                        potholeCount:
                            d.potholeCount,

                        severity:
                            d.severity,

                        reportStatus:
                            d.reportStatus ||
                            'reported',

                        location:
                            d.location,

                        createdAt:
                            d.createdAt
                    })
                );

            res.json({

                success: true,

                data:
                    formatted,

                pagination: {

                    page,

                    limit,

                    total,

                    totalPages:
                        Math.ceil(
                            total / limit
                        )
                }
            });

        } catch (error) {

            console.error(
                'Admin detections error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to fetch admin detections'
            });
        }
    }
);

// ============================================================
// DELETE /api/detections/:id
// ============================================================

router.delete(
    '/detections/:id',
    authenticate,
    async (req, res) => {

        try {

            const detection =
                await Detection.findByIdAndDelete(
                    req.params.id
                );

            if (!detection) {

                return res.status(404).json({

                    success: false,

                    error:
                        'Detection not found'
                });
            }

            res.json({

                success: true,

                message:
                    'Detection deleted'
            });

        } catch (error) {

            console.error(
                'Delete detection error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to delete detection'
            });
        }
    }
);

// ============================================================
// CITIZEN REPORT ROUTES
// ============================================================

const CitizenReport =
    require('../models/CitizenReport');

// ============================================================
// POST /api/reports/escalate-critical
// ============================================================

router.post(
    '/reports/escalate-critical',
    authenticate,
    async (req, res) => {

        try {

            const openReports =
                await CitizenReport.find({

                    reportLifecycle: {

                        $nin: [
                            'closed',
                            'fixed'
                        ]
                    }

                }).populate(
                    'detectionId'
                );

            const criticalReports =
                openReports.filter(
                    r =>
                        r.detectionId &&
                        r.detectionId.severity ===
                        'critical'
                );

            let count = 0;

            for (
                const report of criticalReports
            ) {

                report.priorityScore =
                    Math.min(

                        1.0,

                        (
                            report.priorityScore ||
                            0.5
                        ) + 0.15
                    );

                await report.save();

                count++;
            }

            res.json({

                success: true,

                count
            });

        } catch (error) {

            console.error(
                'Escalate critical reports error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to escalate critical reports'
            });
        }
    }
);

// ============================================================
// POST /api/reports/bulk-escalate
// ============================================================

router.post(
    '/reports/bulk-escalate',
    authenticate,
    async (req, res) => {

        try {

            const {
                reportIds
            } = req.body;

            if (
                !reportIds ||
                !Array.isArray(reportIds)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        'reportIds array is required'
                });
            }

            let count = 0;

            for (
                const id of reportIds
            ) {

                const report =
                    await CitizenReport.findById(
                        id
                    );

                if (report) {

                    report.priorityScore =
                        Math.min(

                            1.0,

                            (
                                report.priorityScore ||
                                0.5
                            ) + 0.15
                        );

                    await report.save();

                    count++;
                }
            }

            res.json({

                success: true,

                count
            });

        } catch (error) {

            console.error(
                'Bulk escalate error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to bulk escalate'
            });
        }
    }
);

// ============================================================
// POST /api/reports/bulk-close
// ============================================================

router.post(
    '/reports/bulk-close',
    authenticate,
    async (req, res) => {

        try {

            const {
                reportIds
            } = req.body;

            if (
                !reportIds ||
                !Array.isArray(reportIds)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        'reportIds array is required'
                });
            }

            let count = 0;

            for (
                const id of reportIds
            ) {

                const report =
                    await CitizenReport.findByIdAndUpdate(

                        id,

                        {
                            reportLifecycle:
                                'closed',

                            closedAt:
                                new Date()
                        }
                    );

                if (report) {
                    count++;
                }
            }

            res.json({

                success: true,

                count
            });

        } catch (error) {

            console.error(
                'Bulk close error:',
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    'Failed to bulk close'
            });
        }
    }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;