// Standard error response for every endpoint.
export function errorHandler(err, req, res, next) {
  let status = err.status ?? 500
  let code = err.code
  let message = err.message
  let errors = err.errors

  // Mongoose schema validation failed.
  if (err.name === 'ValidationError') {
    status = 400
    code = 'VALIDATION_ERROR'
    message = 'Validation failed'
    errors = Object.values(err.errors).map((item) => ({ field: item.path, message: item.message }))
  }

  // Duplicate key, e.g. an email that already exists.
  if (err.code === 11000) {
    status = 409
    code = 'EMAIL_TAKEN'
    message = `That ${Object.keys(err.keyPattern ?? {})[0] ?? 'value'} is already registered`
  }

  // Bad ObjectId in the URL.
  if (err.name === 'CastError') {
    status = 400
    code = 'VALIDATION_ERROR'
    message = `Invalid ${err.path}`
  }

  const unexpected = status >= 500
  if (unexpected) console.error('Unhandled error:', err)

  res.status(status).json({
    success: false,
    message: unexpected ? 'Something went wrong' : message,
    code: code ?? (unexpected ? 'INTERNAL_ERROR' : 'ERROR'),
    data: null,
    errors,
  })
}
