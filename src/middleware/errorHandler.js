export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  console.error("Error:", {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  // Operational Errors (erwartete Fehler)
  if (err.isOperational || err instanceof AppError) {
    return res.status(err.statusCode || 500).json({
      error: err.message,
      details: err.details
    });
  }
  
  // SQL Errors
  if (err.name === "RequestError" || err.name === "ConnectionError") {
    return res.status(503).json({
      error: "Datenbankfehler",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
  
  // Validation Errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validierungsfehler",
      details: err.errors || err.message
    });
  }
  
  // Multer Errors (File Upload)
  if (err.name === "MulterError") {
    return res.status(400).json({
      error: "Datei-Upload Fehler",
      details: err.message
    });
  }
  
  // Unerwartete Fehler
  res.status(500).json({
    error: "Interner Serverfehler",
    details: process.env.NODE_ENV === "development" ? err.message : undefined
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Nicht gefunden",
    path: req.path
  });
}