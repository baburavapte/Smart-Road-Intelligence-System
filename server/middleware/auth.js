const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = (req, res, next) => {
    // 1. Check for API key (microservices & MCP server authorization)
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const configuredApiKey = process.env.ROADSENSE_API_KEY;

    if (configuredApiKey && apiKey === configuredApiKey) {
        req.user = {
            userId: '000000000000000000000000', // Dummy Object ID for system client
            role: 'admin',
            name: 'API Key Client',
            email: 'admin@smartcity.gov.in'
        };
        return next();
    }

    // 2. Fallback to JWT Token validation
    let token = req.cookies?.roadsense_token;
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Session or API Key missing' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
};

module.exports = authenticate;
