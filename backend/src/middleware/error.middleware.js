/**
 * @file error.middleware.js
 * @description Centralized error handling middleware.
 * Prevents stack trace leakages in production and standardizes API error payloads.
 */

const errorHandler = (err, req, res, next) => {
  console.error(`[Unhandled Error] ${err.name}: ${err.message}`);

  // Handle Mongoose Bad ObjectID (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Resource not found with malformed identifier: ${err.value}`,
    });
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `Duplicate value entered for ${duplicateField}. Must be unique.`,
    });
  }

  // Handle Mongoose Schema Validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      error: 'Database schema validation failed',
      details: messages,
    });
  }

  // Generic fallback: never expose internal stack traces in production
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  return res.status(statusCode).json({
    success: false,
    error: isProduction ? 'An unexpected server error occurred.' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;

