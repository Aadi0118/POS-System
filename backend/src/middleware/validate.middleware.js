/**
 * @file validate.middleware.js
 * @description Zod validation middleware for HTTP request payloads.
 * Prevents NoSQL injections, prototype pollutions, and invalid data formats before hitting controllers.
 */

const { ZodError } = require('zod');

/**
 * Higher-order middleware factory that validates incoming request parts (body, params, query)
 * against a specified Zod schema.
 *
 * @param {import('zod').ZodTypeAny} schema - Zod schema defining valid payload structure
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => async (req, res, next) => {
  try {
    // Validate request components matching schema structure
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Replace request parts with sanitized, type-coerced, validated data
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Format validation errors cleanly without exposing internal runtime details
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formattedErrors,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Malformed request payload',
    });
  }
};

module.exports = validate;

