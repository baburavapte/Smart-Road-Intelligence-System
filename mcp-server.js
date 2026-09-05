/**
 * Pothole Detection System - MCP Server
 * Exposes pothole data and analytics as tools for Model Context Protocol (MCP) clients.
 * Uses native Node.js libraries to ensure zero extra dependencies.
 */

const readline = require('readline');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Zero-dependency .env loader to read ROADSENSE_API_KEY
function loadEnv() {
    const envPaths = [
        path.join(__dirname, '.env'),
        path.join(__dirname, 'server', '.env')
    ];
    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            try {
                const content = fs.readFileSync(envPath, 'utf8');
                content.split(/\r?\n/).forEach(line => {
                    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                    if (match) {
                        const key = match[1];
                        let value = match[2] || '';
                        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                            value = value.substring(1, value.length - 1);
                        } else if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
                            value = value.substring(1, value.length - 1);
                        }
                        if (!process.env[key]) {
                            process.env[key] = value.trim();
                        }
                    }
                });
                break;
            } catch (err) {
                // Ignore
            }
        }
    }
}
loadEnv();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const ROADSENSE_API_KEY = process.env.ROADSENSE_API_KEY;

const TOOLS = [
    {
        name: 'get_pothole_stats',
        description: 'Get current statistics of pothole reports (total reports, fixed, pending, critical).',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'get_potholes_near_route',
        description: 'Find potholes near a route given by an array of [longitude, latitude] coordinates.',
        inputSchema: {
            type: 'object',
            properties: {
                coordinates: {
                    type: 'array',
                    items: {
                        type: 'array',
                        items: { type: 'number' },
                        minItems: 2,
                        maxItems: 2
                    },
                    description: 'Array of [lng, lat] coordinate pairs'
                },
                radius: {
                    type: 'number',
                    description: 'Search radius in meters (default is 500m)',
                    default: 500
                }
            },
            required: ['coordinates']
        }
    },
    {
        name: 'get_pothole_reports',
        description: 'Get a list of pothole reports with optional filters for status, severity, and pagination.',
        inputSchema: {
            type: 'object',
            properties: {
                page: { type: 'integer', description: 'Page number (default 1)' },
                limit: { type: 'integer', description: 'Limit per page (default 20)' },
                status: { type: 'string', description: 'Filter by status: reported, under_review, in_progress, fixed' },
                severity: { type: 'string', description: 'Filter by severity: none, low, medium, high, critical' }
            }
        }
    },
    {
        name: 'update_pothole_status',
        description: 'Update the report status of a specific pothole detection.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'The unique ID of the detection' },
                status: { type: 'string', description: 'New status: reported, under_review, in_progress, fixed' }
            },
            required: ['id', 'status']
        }
    },
    {
        name: 'get_road_health',
        description: 'Get health scores and categories of all monitored roads.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'get_priority_roads',
        description: 'Get list of roads ranked by urgency priority for repairs.',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'get_forecasts',
        description: 'Get linear regression health forecasting (30/60/90 days) for a specific road ID.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'The unique ID of the road' }
            },
            required: ['id']
        }
    },
    {
        name: 'get_repair_history',
        description: 'Get all repair proof records (before/after images, team, notes).',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'get_notifications',
        description: 'Get notifications for a citizen given their email address.',
        inputSchema: {
            type: 'object',
            properties: {
                email: { type: 'string', description: 'The citizen email address' }
            },
            required: ['email']
        }
    }
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    try {
        const message = JSON.parse(line);
        handleMessage(message);
    } catch (e) {
        // Silently ignore malformed lines
    }
});

function sendResponse(id, result) {
    console.log(JSON.stringify({
        jsonrpc: '2.0',
        id,
        result
    }));
}

function sendError(id, code, message) {
    console.log(JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code, message }
    }));
}

function apiCall(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = `${API_URL}${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (ROADSENSE_API_KEY) {
            options.headers['x-api-key'] = ROADSENSE_API_KEY;
        }

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(parsed.error || `HTTP error ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function handleMessage(message) {
    const { id, method, params } = message;

    if (method === 'initialize') {
        return sendResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {}
            },
            serverInfo: {
                name: 'pothole-detection-mcp',
                version: '1.0.0'
            }
        });
    }

    if (method === 'notifications/initialized') {
        return;
    }

    if (method === 'tools/list') {
        return sendResponse(id, { tools: TOOLS });
    }

    if (method === 'tools/call') {
        const { name, arguments: args } = params;
        try {
            let resultText = '';
            if (name === 'get_pothole_stats') {
                const res = await apiCall('GET', '/admin/stats');
                resultText = JSON.stringify(res.stats, null, 2);
            } else if (name === 'get_potholes_near_route') {
                const res = await apiCall('POST', '/detections/near-route', {
                    coordinates: args.coordinates,
                    radius: args.radius || 500
                });
                resultText = JSON.stringify({ total: res.total, potholes: res.data }, null, 2);
            } else if (name === 'get_pothole_reports') {
                let path = `/admin/detections?page=${args.page || 1}&limit=${args.limit || 20}`;
                if (args.status) path += `&status=${args.status}`;
                if (args.severity) path += `&severity=${args.severity}`;
                const res = await apiCall('GET', path);
                resultText = JSON.stringify({ pagination: res.pagination, reports: res.data }, null, 2);
            } else if (name === 'update_pothole_status') {
                const res = await apiCall('PATCH', `/detections/${args.id}/status`, {
                    reportStatus: args.status
                });
                resultText = JSON.stringify(res, null, 2);
            } else if (name === 'get_road_health') {
                const res = await apiCall('GET', '/road-health');
                resultText = JSON.stringify(res.data, null, 2);
            } else if (name === 'get_priority_roads') {
                const res = await apiCall('GET', '/road-health/priority');
                resultText = JSON.stringify(res.data, null, 2);
            } else if (name === 'get_forecasts') {
                const res = await apiCall('GET', `/road-health/${args.id}/forecast`);
                resultText = JSON.stringify(res.forecast, null, 2);
            } else if (name === 'get_repair_history') {
                const res = await apiCall('GET', '/repair');
                resultText = JSON.stringify(res.data, null, 2);
            } else if (name === 'get_notifications') {
                const res = await apiCall('GET', `/notifications?email=${encodeURIComponent(args.email)}`);
                resultText = JSON.stringify(res.data, null, 2);
            } else {
                return sendError(id, -32601, `Tool not found: ${name}`);
            }

            return sendResponse(id, {
                content: [
                    {
                        type: 'text',
                        text: resultText
                    }
                ]
            });
        } catch (err) {
            return sendResponse(id, {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${err.message} (Is the Express backend server running on port 3000?)`
                    }
                ],
                isError: true
            });
        }
    }

    if (id !== undefined) {
        return sendError(id, -32601, `Method not found: ${method}`);
    }
}
