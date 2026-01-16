// ============================================================================
// SHARED API CLIENT
// ============================================================================

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function api(url, options = {}) {
  const opts = {
    credentials: "include",
    headers: {
      ...(options.headers || {})
    },
    ...options
  };
  
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  
  try {
    const response = await fetch(url, opts);
    
    const contentType = response.headers.get("content-type");
    let data = null;
    
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (!response.ok) {
      const message = data?.error || `HTTP ${response.status}`;
      throw new ApiError(message, response.status, data);
    }
    
    return data;
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      error.message || "Netzwerkfehler",
      0,
      { originalError: error }
    );
  }
}
