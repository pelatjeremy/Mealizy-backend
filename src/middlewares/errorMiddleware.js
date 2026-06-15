export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors).map((entry) => entry.message).join(" ");
  }

  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "champ";
    message = `${field} déjà utilisé.`;
  }

  res.status(statusCode).json({
    message,
    details: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
}
