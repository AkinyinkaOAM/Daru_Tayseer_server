const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Middleware to check validation results from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return ApiResponse.error(
      res,
      'Validation failed',
      400,
      extractedErrors
    );
  }
  next();
};

module.exports = validate;

