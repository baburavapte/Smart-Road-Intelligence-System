const AuditLog = require('../models/AuditLog');

const auditLogger = (actionType, targetResource) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        
        res.json = function (data) {
            res.json = originalJson;
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const actorName = req.user ? req.user.name : 'System/Anonymous';
                const actorId = req.user ? req.user.userId : null;
                const ipAddress = req.ip || req.connection.remoteAddress || '';
                const userAgent = req.get('User-Agent') || '';
                
                let targetResourceId = req.params.id || '';
                let changesDetails = {
                    body: req.body,
                    params: req.params,
                    query: req.query
                };

                AuditLog.create({
                    actionType,
                    targetResource,
                    targetResourceId,
                    actorId,
                    actorName,
                    ipAddress,
                    userAgent,
                    changesDetails
                }).catch(err => console.error('Audit logging failed:', err.message));
            }
            
            return originalJson.apply(this, arguments);
        };
        
        next();
    };
};

module.exports = auditLogger;
