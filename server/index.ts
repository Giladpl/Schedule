import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { debugTest } from "./debug-test";
import { registerRoutes } from "./routes";

// Load environment variables from .env file
dotenv.config();

// This will be explicitly executed when running in debug mode
// and makes it easy to verify the debugger is working
const debugMode = process.execArgv.some(
  (arg) => arg.includes("--inspect") || arg.includes("--debug")
);
if (debugMode) {
  console.log("🔵 Debugger detected, debug mode is active");
}

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Add basic request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  console.log(
    `${new Date().toISOString()} - ${req.method} ${path} - Request started`
  );

  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${new Date().toISOString()} - ${req.method} ${path} ${
        res.statusCode
      } in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});

async function main() {
  try {
    // Run debug test when in debug mode
    if (debugMode) {
      console.log("Running debug test...");
      debugTest(); // You can set a breakpoint here in VSCode
    }

    console.log("Environment variables loaded");
    console.log("Environment:", {
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? "Present" : "Missing",
      GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID
        ? "Present"
        : "Missing",
      PORT: process.env.PORT || "3000 (default)",
    });

    // Configure Express middleware
    app.use(express.json());
    console.log("Express middleware configured");

    console.log("Starting server initialization...");

    // Create HTTP server instance
    const server = createServer(app);
    console.log("HTTP server instance created");

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM signal received. Closing HTTP server...");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });

    // Register routes
    await registerRoutes(app);
    console.log("API routes registered successfully");

    // Start the server
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    return server;
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
