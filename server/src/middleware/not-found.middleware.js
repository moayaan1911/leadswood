// Unmatched routes are handed to the error handler.
export function notFound(req, res, next) {
  next(
    Object.assign(new Error(`Route not found: ${req.method} ${req.originalUrl}`), {
      status: 404,
      code: 'NOT_FOUND',
    }),
  )
}
