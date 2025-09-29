// middleware/validateFormData.js
const validateFormData = (req, res, next) => { 
  const contentType = req.headers["content-type"];
  
  if (!contentType || !contentType.includes("multipart/form-data")) {
    return res.status(400).json({
      error: "Invalid request: Content-Type must be multipart/form-data",
    });
  }

  next();
};

// middleware/validateJson.js
const validateJson = (req, res, next) => {
  const contentType = req.headers["content-type"];

  if (!contentType || !contentType.includes("application/json")) {
    return res.status(400).json({
      error: "Invalid Content-Type. Expected application/json",
    });
  }

  // Check for malformed JSON (Express's built-in json parser handles this if used)
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      error: "Malformed JSON body",
    });
  }

  next();
};

module.exports = {
    validateFormData,
    validateJson
};
