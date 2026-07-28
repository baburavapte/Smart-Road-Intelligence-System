/**
 * Validation Middleware — express-validator wrapper
 * Provides reusable validation chains and a result handler.
 *
 * SECURITY: All user input is validated, sanitized, and escaped
 * before reaching route handlers or MongoDB queries.
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware: check validation results and return 422 if invalid.
 * Place after validation chains in the route middleware array.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
}

// ─── LOGIN VALIDATION (Unified: email + password only) ─────────
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password must be between 1 and 128 characters')
    .trim(),

  handleValidationErrors
];

// ─── CITIZEN REPORT VALIDATION ─────────────────────────────────
const validateCitizenReport = [
  body('detectionId')
    .notEmpty()
    .withMessage('Detection ID is required')
    .trim(),

  body('reporterName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Name must be at most 100 characters')
    .trim()
    .escape(),

  body('reporterEmail')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('reporterPhone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone must be at most 20 characters')
    .trim()
    .escape(),

  body('description')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Description must be at most 300 characters')
    .trim()
    .escape(),

  handleValidationErrors
];

// ─── LIFECYCLE UPDATE VALIDATION ───────────────────────────────
const validateLifecycleUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid report ID'),

  body('lifecycle')
    .isIn(['reported', 'verified', 'assigned', 'in_progress', 'fixed', 'closed'])
    .withMessage('Invalid lifecycle stage'),

  body('assignedTeam')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Team name must be at most 100 characters')
    .trim()
    .escape(),

  handleValidationErrors
];

// ─── PAGINATION QUERY VALIDATION ───────────────────────────────
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  handleValidationErrors
];

// ─── REPORT FILTER VALIDATION ──────────────────────────────────
const validateReportFilters = [
  query('zone')
    .optional()
    .isIn(['A', 'B', 'C', 'D', 'Zone A', 'Zone B', 'Zone C', 'Zone D'])
    .withMessage('Invalid zone'),

  query('severity')
    .optional()
    .isIn(['low', 'moderate', 'critical'])
    .withMessage('Severity must be one of: low, moderate, critical'),

  query('status')
    .optional()
    .isIn(['reported', 'verified', 'assigned', 'in_progress', 'fixed', 'closed'])
    .withMessage('Invalid status'),

  query('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),

  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateCitizenReport,
  validateLifecycleUpdate,
  validatePagination,
  validateReportFilters
};
