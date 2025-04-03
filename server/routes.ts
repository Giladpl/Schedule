import { bookingFormSchema } from "@shared/schema";
import type { Express } from "express";
import { calendar_v3, google, sheets_v4 } from "googleapis";
import { fromZodError } from "zod-validation-error";
import { storage } from "./storage";

const JERUSALEM_TIMEZONE = "Asia/Jerusalem";

// Google API client interfaces
interface GoogleClients {
  calendar: calendar_v3.Calendar | null;
  sheets: sheets_v4.Sheets | null;
}

export async function registerRoutes(app: Express): Promise<void> {
  console.log("Starting route registration...");

  // Add health check endpoint
  app.get("/health", (req, res) => {
    console.log("Health check request received");
    res.json({ status: "ok" });
  });

  // Test endpoint to verify debugging
  app.get("/api/test-debug", (req, res) => {
    console.log("TEST ENDPOINT HIT - SHOULD TRIGGER BREAKPOINT");
    res.json({ debug: "working" });
  });

  // Google API setup
  console.log("Setting up Google API clients...");
  const googleClients = setupGoogleClients();
  const { calendar, sheets } = googleClients;

  // Load client rules from Google Sheets
  if (!sheets) {
    console.log(
      "Google Sheets API client not available, skipping client rules"
    );
  } else {
    try {
      console.log("Loading client rules from Google Sheets...");
      await loadClientRulesFromSheets(sheets);
      console.log("Successfully loaded client rules");
    } catch (error) {
      console.error("Error loading client rules from Google Sheets:", error);
      console.log("No client rules will be created");
    }
  }

  // Load meeting types
  console.log("Creating default meeting types...");
  await createDefaultMeetingTypes();
  console.log("Successfully created default meeting types");

  // Load calendar data if Google Calendar is configured
  if (process.env.GOOGLE_CALENDAR_ID && calendar) {
    try {
      console.log("Starting initial calendar sync...");
      await syncWithGoogleCalendar(calendar);
      console.log("Initial calendar sync completed");
    } catch (error) {
      console.error("Error during initial calendar sync:", error);
      console.log("Creating sample timeslots instead");
      await createSampleTimeslots();
    }
  } else {
    console.log(
      "Google Calendar integration not configured, creating sample timeslots"
    );
    await createSampleTimeslots();
  }

  // Register API routes
  console.log("Registering API routes...");

  // API routes
  app.get("/api/timeslots", async (req, res) => {
    console.log("[Debug] Timeslots endpoint hit");
    console.log("[Debug] Query params:", req.query);
    console.log("[Debug] Request headers:", req.headers);
    try {
      const { start, end, type, meetingType } = req.query;
      console.log("[Debug] Parsed query params:", {
        start,
        end,
        type,
        meetingType,
      });

      let timeslots;

      if (start && end) {
        const startDate = new Date(start as string);
        const endDate = new Date(end as string);
        console.log("Fetching timeslots between", startDate, "and", endDate);

        if (type && meetingType) {
          // Filter by date range, client type, and meeting type
          timeslots = await storage.getTimeslotsByDateRange(startDate, endDate);

          // Special handling for 'all' values
          if (type === "all" && meetingType === "all") {
            // Return all timeslots in date range
            console.log(
              "Both type and meetingType are 'all', returning all timeslots in date range"
            );
          } else if (type === "all") {
            // Filter only by meeting type
            timeslots = timeslots.filter((ts) =>
              ts.meetingTypes.includes(meetingType as string)
            );
            console.log(
              "Type is 'all', filtered by meeting type only. Found",
              timeslots.length,
              "timeslots for meeting type",
              meetingType
            );
          } else if (meetingType === "all") {
            // Filter only by client type
            timeslots = timeslots.filter((ts) => ts.clientType === type);
            console.log(
              "MeetingType is 'all', filtered by client type only. Found",
              timeslots.length,
              "timeslots for type",
              type
            );
          } else {
            // Normal filter by both client type and meeting type
            timeslots = timeslots.filter(
              (ts) =>
                ts.clientType === type &&
                ts.meetingTypes.includes(meetingType as string)
            );
            console.log(
              "Found",
              timeslots.length,
              "timeslots for type",
              type,
              "and meeting type",
              meetingType
            );
          }
        } else if (type) {
          // Filter by date range and client type
          timeslots = await storage.getTimeslotsByDateRange(startDate, endDate);

          // Special handling for 'all' type
          if (type === "all") {
            console.log("Type is 'all', returning all timeslots in date range");
          } else {
            timeslots = timeslots.filter((ts) => ts.clientType === type);
            console.log("Found", timeslots.length, "timeslots for type", type);
          }
        } else if (meetingType) {
          // Filter by date range and meeting type
          timeslots = await storage.getTimeslotsByDateRange(startDate, endDate);

          // Special handling for 'all' meeting type
          if (meetingType === "all") {
            console.log(
              "MeetingType is 'all', returning all timeslots in date range"
            );
          } else {
            timeslots = timeslots.filter((ts) =>
              ts.meetingTypes.includes(meetingType as string)
            );
            console.log(
              "Found",
              timeslots.length,
              "timeslots for meeting type",
              meetingType
            );
          }
        } else {
          // Just filter by date range
          timeslots = await storage.getTimeslotsByDateRange(startDate, endDate);
          console.log("Found", timeslots.length, "timeslots in date range");
        }
      } else if (type && meetingType) {
        // Filter by client type and meeting type
        if (type === "all" && meetingType === "all") {
          // Return all available timeslots
          timeslots = await storage.getTimeslots();
          timeslots = timeslots.filter((ts) => ts.isAvailable);
          console.log(
            "Both type and meetingType are 'all', returning all available timeslots"
          );
        } else if (type === "all") {
          // Filter only by meeting type
          timeslots = await storage.getTimeslotsByMeetingType(
            meetingType as string
          );
          console.log(
            "Type is 'all', found",
            timeslots.length,
            "timeslots for meeting type",
            meetingType
          );
        } else if (meetingType === "all") {
          // Filter only by client type
          timeslots = await storage.getTimeslotsByClientType(type as string);
          console.log(
            "MeetingType is 'all', found",
            timeslots.length,
            "timeslots for type",
            type
          );
        } else {
          // Normal filter by both client type and meeting type
          timeslots = await storage.getTimeslotsByClientAndMeetingType(
            type as string,
            meetingType as string
          );
          console.log(
            "Found",
            timeslots.length,
            "timeslots for type",
            type,
            "and meeting type",
            meetingType
          );
        }
      } else if (type) {
        // Filter by client type
        if (type === "all") {
          // Return all available timeslots
          timeslots = await storage.getTimeslots();
          timeslots = timeslots.filter((ts) => ts.isAvailable);
          console.log("Type is 'all', returning all available timeslots");
        } else {
          // Filter by the specific client type
          timeslots = await storage.getTimeslotsByClientType(type as string);
          console.log("Found", timeslots.length, "timeslots for type", type);
        }
      } else if (meetingType) {
        // Filter by meeting type
        if (meetingType === "all") {
          // Return all available timeslots
          timeslots = await storage.getTimeslots();
          timeslots = timeslots.filter((ts) => ts.isAvailable);
          console.log(
            "MeetingType is 'all', returning all available timeslots"
          );
        } else {
          // Filter by the specific meeting type
          timeslots = await storage.getTimeslotsByMeetingType(
            meetingType as string
          );
          console.log(
            "Found",
            timeslots.length,
            "timeslots for meeting type",
            meetingType
          );
        }
      } else {
        // Return all available timeslots
        timeslots = await storage.getTimeslots();
        timeslots = timeslots.filter((ts) => ts.isAvailable);
        console.log("Found", timeslots.length, "available timeslots");
      }

      console.log("Sending timeslots response");
      res.json(timeslots);
    } catch (error) {
      console.error("Error fetching timeslots:", error);
      res.status(500).json({ error: "Failed to fetch timeslots" });
    }
  });

  app.get("/api/timeslots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const timeslot = await storage.getTimeslotById(id);

      if (!timeslot) {
        return res.status(404).json({ error: "Timeslot not found" });
      }

      res.json(timeslot);
    } catch (error) {
      console.error("Error fetching timeslot:", error);
      res.status(500).json({ error: "Failed to fetch timeslot" });
    }
  });

  app.get("/api/client-rules", async (req, res) => {
    try {
      const { type } = req.query;

      if (type) {
        const rule = await storage.getClientRuleByType(type as string);
        if (!rule) {
          return res.status(404).json({ error: "Client rule not found" });
        }
        res.json(rule);
      } else {
        const rules = await storage.getClientRules();
        res.json(rules);
      }
    } catch (error) {
      console.error("Error fetching client rules:", error);
      res.status(500).json({ error: "Failed to fetch client rules" });
    }
  });

  // API endpoint for client types with their meeting types and durations - legacy format
  app.get("/api/client-meeting-types", async (req, res) => {
    try {
      const rules = await storage.getClientRules();

      // Transform the rules into the desired format
      const clientMeetingTypes: Record<string, Record<string, number>> = {};

      rules.forEach((rule) => {
        const clientType = rule.clientType;

        // Skip inactive rules and "all" type
        if (!rule.isActive || clientType === "all") return;

        // Create an entry for this client type if it doesn't exist
        if (!clientMeetingTypes[clientType]) {
          clientMeetingTypes[clientType] = {};
        }

        // Each rule has a single meeting type from a sheet column header
        const meetingType = rule.allowedTypes;

        // Only add if this meeting type has a valid duration
        if (meetingType && meetingType.trim() !== "" && rule.duration > 0) {
          // Use the original meeting type name from the sheet
          clientMeetingTypes[clientType][meetingType] = rule.duration;
        }
      });

      res.json(clientMeetingTypes);
    } catch (error) {
      console.error("Error fetching client meeting types:", error);
      res.status(500).json({ error: "Failed to fetch client meeting types" });
    }
  });

  // New API endpoint with the exact structure requested
  app.get("/api/client-data", async (req, res) => {
    try {
      const rules = await storage.getClientRules();

      // Group rules by client type
      const clientMap: Map<string, Map<string, number>> = new Map();

      // Process each rule
      rules.forEach((rule) => {
        const clientType = rule.clientType;

        // Skip inactive rules and "all" type
        if (!rule.isActive || clientType === "all") return;

        // Get meetingType map for this client, or create a new one
        if (!clientMap.has(clientType)) {
          clientMap.set(clientType, new Map<string, number>());
        }

        const meetingsMap = clientMap.get(clientType)!;

        // Each rule has a single meeting type and duration
        const meetingType = rule.allowedTypes;

        // Only add if valid meeting type and duration
        if (meetingType && meetingType.trim() !== "" && rule.duration > 0) {
          meetingsMap.set(meetingType, rule.duration);
        }
      });

      // Convert to the exact format requested
      const result = {
        clients: Array.from(clientMap.entries()).map(([type, meetingsMap]) => {
          // Convert the meetings Map to the required format object
          const meetings: Record<string, number> = {};
          meetingsMap.forEach((duration, meetingType) => {
            meetings[meetingType] = duration;
          });

          return {
            type,
            meetings,
          };
        }),
      };

      res.json(result);
    } catch (error) {
      console.error("Error fetching client data:", error);
      res.status(500).json({ error: "Failed to fetch client data" });
    }
  });

  // Add a refresh route to reload client rules from Google Sheets
  app.get("/api/refresh-client-rules", async (req, res) => {
    try {
      console.log("Manually refreshing client rules from Google Sheets");
      const sheets = setupGoogleClients().sheets;
      await loadClientRulesFromSheets(sheets);

      // Get the updated rules to return them
      const rules = await storage.getClientRules();

      res.json({
        success: true,
        message: "Client rules refreshed successfully",
        rules,
      });
    } catch (error) {
      console.error("Error refreshing client rules:", error);
      res.status(500).json({
        success: false,
        error: "Failed to refresh client rules",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Debug endpoint for Google Sheet data
  app.get("/api/debug/sheet-data", async (_req, res) => {
    try {
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      if (!spreadsheetId) {
        return res
          .status(400)
          .json({ error: "Google Sheet ID not configured" });
      }

      // Initialize the Google Sheets client using the existing function
      const { sheets } = setupGoogleClients();

      if (!sheets) {
        return res
          .status(500)
          .json({ error: "Failed to initialize Google Sheets client" });
      }

      // Get the raw data from the sheet for debugging
      const sheetName = "Platforms";
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:E20`, // Get more rows to see the full structure
      });

      const rows = response.data.values;

      // Create a structured representation of the sheet
      const sheetDebugInfo: {
        rawData: any[][] | undefined;
        headers: any[];
        dataRows: any[][];
        interpretedClientRules: Array<{
          rowIndex: number;
          rowId: string | undefined;
          rawClientTypeValue: string;
          mappedClientType: string;
          durations: {
            phone: number;
            zoom: number;
            inPerson: number;
          };
          availableMeetingTypes: string[];
          allowedTypes: string;
        }>;
      } = {
        rawData: rows || [],
        headers: rows && rows.length > 0 ? rows[0] : [],
        dataRows: rows ? rows.slice(1) : [],
        interpretedClientRules: [],
      };

      // Interpret each row as we would in the client rules function
      if (rows && rows.length > 1) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          const rowIndex = i;
          const rowId = row[0]?.trim();
          const clientTypeValue = row[1]?.trim();

          if (!clientTypeValue) continue;

          const phoneDuration = parseInt(row[2]?.trim() || "0");
          const zoomDuration = parseInt(row[3]?.trim() || "0");
          const inPersonDuration = parseInt(row[4]?.trim() || "0");

          // Map client types
          let clientType = "unknown";
          if (clientTypeValue) {
            if (
              clientTypeValue.includes("מדריכים+") ||
              clientTypeValue.toLowerCase().includes("vip")
            ) {
              clientType = "vip";
            } else if (
              clientTypeValue.includes("new_customer") ||
              clientTypeValue.toLowerCase().includes("new")
            ) {
              clientType = "new";
            } else if (
              clientTypeValue.includes("פולי אחים") ||
              clientTypeValue.toLowerCase().includes("quick")
            ) {
              clientType = "quick";
            } else if (
              clientTypeValue.toLowerCase().includes("all") ||
              clientTypeValue.includes("כל")
            ) {
              clientType = "all";
            }
          }

          // Calculate available meeting types
          const availableMeetingTypes: string[] = [];
          if (inPersonDuration > 0) availableMeetingTypes.push("in-person");
          if (zoomDuration > 0) availableMeetingTypes.push("zoom");
          if (phoneDuration > 0) availableMeetingTypes.push("phone");

          // Add interpreted row data
          sheetDebugInfo.interpretedClientRules.push({
            rowIndex,
            rowId,
            rawClientTypeValue: clientTypeValue,
            mappedClientType: clientType,
            durations: {
              phone: phoneDuration,
              zoom: zoomDuration,
              inPerson: inPersonDuration,
            },
            availableMeetingTypes,
            allowedTypes: availableMeetingTypes.join(","),
          });
        }
      }

      // Also include the current client rules from the database
      const currentRules = await storage.getClientRules();

      // Return all the debug information
      res.json({
        sheetDebugInfo,
        currentStoredRules: currentRules,
        headers: {
          expectedHeaders: [
            "RowID",
            "Client Type",
            "Phone",
            "Zoom",
            "In-Person",
          ],
          actualHeaders: rows && rows.length > 0 ? rows[0] : ([] as any[]),
        },
      });
    } catch (error: any) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error.message || String(error),
      });
    }
  });

  app.get("/api/meeting-types", async (req, res) => {
    try {
      const meetingTypes = await storage.getMeetingTypes();
      res.json(meetingTypes);
    } catch (error) {
      console.error("Error fetching meeting types:", error);
      res.status(500).json({ error: "Failed to fetch meeting types" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = bookingFormSchema.safeParse(req.body);

      if (!validatedData.success) {
        const errorMessage = fromZodError(validatedData.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const bookingData = validatedData.data;

      // Check if timeslot exists and is available
      const timeslot = await storage.getTimeslotById(bookingData.timeslotId);

      if (!timeslot) {
        return res.status(404).json({ error: "Timeslot not found" });
      }

      if (!timeslot.isAvailable) {
        return res
          .status(400)
          .json({ error: "This timeslot is no longer available" });
      }

      // Verify that the selected meeting type is allowed for this timeslot
      if (!timeslot.meetingTypes.includes(bookingData.meetingType)) {
        return res.status(400).json({
          error: `This meeting type (${bookingData.meetingType}) is not available for this timeslot`,
        });
      }

      // Create booking
      const booking = await storage.createBooking(bookingData);

      // Update Google Calendar if API is available
      if (calendar && timeslot.googleEventId) {
        try {
          // Update the Google Calendar event
          await handleBookingInGoogleCalendar(calendar, timeslot, booking);
        } catch (error) {
          console.error("Error updating Google Calendar event:", error);
          // Continue with the response even if Google Calendar update fails
        }
      }

      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.get("/api/sync-calendar", async (req, res) => {
    console.log("Received calendar sync request");
    if (!calendar) {
      console.log("Calendar API not configured, returning error");
      return res
        .status(500)
        .json({ error: "Google Calendar API not configured" });
    }

    try {
      console.log("Starting calendar sync...");
      await syncWithGoogleCalendar(calendar);
      console.log("Calendar sync completed successfully");
      res.json({ message: "Calendar sync completed successfully" });
    } catch (error) {
      console.error("Error during calendar sync:", error);
      res.status(500).json({ error: "Failed to sync with Google Calendar" });
    }
  });

  app.get("/api/sync-client-rules", async (req, res) => {
    try {
      // Use our direct implementation regardless of whether Google Sheets API is configured
      await loadClientRulesFromSheets(sheets);
      res.json({ message: "Client rules sync completed successfully" });
    } catch (error) {
      console.error("Error during client rules sync:", error);
      res
        .status(500)
        .json({ error: "Failed to sync client rules from Google Sheets" });
    }
  });

  console.log("API routes registered successfully");
}

// Setup Google API clients
function setupGoogleClients(): GoogleClients {
  try {
    // Use credentials file
    const keyFilePath = "./google-credentials.json";
    const hasSheetId = process.env.GOOGLE_SHEET_ID;
    const hasCalendarId = process.env.GOOGLE_CALENDAR_ID;

    console.log("Setting up Google API clients with:");
    console.log("- Sheet ID:", hasSheetId ? "Present" : "Missing");
    console.log("- Calendar ID:", hasCalendarId ? "Present" : "Missing");
    console.log("- Credentials file:", keyFilePath);

    try {
      // Create auth object with credentials
      const auth = new google.auth.GoogleAuth({
        scopes: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/spreadsheets.readonly",
        ],
        keyFile: keyFilePath,
      });

      console.log("Successfully created auth object");

      // Initialize sheets client if Sheet ID is available
      let sheets = null;
      if (hasSheetId) {
        try {
          sheets = google.sheets({ version: "v4", auth });
          console.log("Successfully initialized Google Sheets client");
        } catch (sheetsError) {
          console.error(
            "Error initializing Google Sheets client:",
            sheetsError
          );
        }
      }

      // Initialize calendar client if Calendar ID is available
      let calendar = null;
      if (hasCalendarId) {
        try {
          calendar = google.calendar({ version: "v3", auth });
          console.log("Successfully initialized Google Calendar client");
        } catch (calendarError) {
          console.error(
            "Error initializing Google Calendar client:",
            calendarError
          );
        }
      }

      // Log which clients were initialized
      console.log("Google Sheets API client initialized:", !!sheets);
      console.log("Google Calendar API client initialized:", !!calendar);

      return { calendar, sheets };
    } catch (authError) {
      console.error("Error creating auth object:", authError);
      throw new Error("Failed to create Google API auth object");
    }
  } catch (error) {
    console.error("Error setting up Google API clients:", error);
    return { calendar: null, sheets: null };
  }
}

// Load client rules from Google Sheets
async function loadClientRulesFromSheets(sheets: sheets_v4.Sheets | null) {
  try {
    console.log("Loading client rules from Google Sheets");

    // First, let's clear any existing rules by removing them
    const existingRules = await storage.getClientRules();
    for (const rule of existingRules) {
      await storage.deleteClientRule(rule.id);
    }
    console.log("Cleared existing client rules");

    if (!sheets) {
      console.log(
        "Google Sheets API client not available, cannot load rules from sheet"
      );
      throw new Error("Google Sheets API client not available");
    }

    // Get the data from the Google Sheet
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("Google Sheet ID not configured");
    }

    // Using the sheet name provided by the user
    const sheetName = "Platforms";

    // First, get the headers to determine the meeting types
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = headersResponse.data.values?.[0] || [];
    console.log("Sheet headers:", JSON.stringify(headers));

    if (headers.length < 3) {
      throw new Error(
        "Sheet has insufficient columns. Expected at least: ID, Client Type, and meeting types"
      );
    }

    // Now get all data rows from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found in the Google Sheet");
      throw new Error("No data found in the Google Sheet");
    }

    // Extract meeting type headers (columns starting from index 2)
    const meetingTypeHeaders: { index: number; name: string }[] = [];
    for (let i = 2; i < headers.length; i++) {
      const header = headers[i]?.trim();
      if (header) {
        meetingTypeHeaders.push({ index: i, name: header });
      }
    }

    console.log(
      "Found meeting types in headers:",
      meetingTypeHeaders.map((h) => h.name).join(", ")
    );

    // Process each row in the sheet that has valid data
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      // Skip rows with insufficient data
      if (!row || row.length < 3) continue;

      // Get client type from column B (index 1)
      const clientTypeValue = row[1]?.trim();
      if (!clientTypeValue) continue;

      // Skip if this is an "all" type or contains "all" or "כל" in the name
      if (
        clientTypeValue.toLowerCase().includes("all") ||
        clientTypeValue.includes("כל")
      ) {
        console.log(`Skipping "all" type client: ${clientTypeValue}`);
        continue;
      }

      console.log(`Processing row for client type: ${clientTypeValue}`);

      // Create client rule for each meeting type with a duration > 0
      for (const meetingTypeHeader of meetingTypeHeaders) {
        const durationStr = row[meetingTypeHeader.index]?.trim() || "";
        const duration = parseInt(durationStr);

        // Skip if no valid duration
        if (isNaN(duration) || duration <= 0) continue;

        // Create a rule for this client type and meeting type
        await storage.createClientRule({
          clientType: clientTypeValue,
          duration: duration,
          allowedTypes: meetingTypeHeader.name,
          isActive: true,
          displayName: clientTypeValue,
        });

        console.log(
          `Added rule for ${clientTypeValue} - ${meetingTypeHeader.name}: ${duration} minutes`
        );
      }
    }

    console.log("Client rules created successfully from sheet data");
    return true;
  } catch (error) {
    console.error("Error loading client rules from Google Sheet:", error);
    throw error;
  }
}

// Helper function to process client rules data
async function processClientRules(rows: any[][]) {
  console.log("Processing client rules from data source");

  // Process each row and create client rules
  for (const row of rows) {
    // Expect row format: [type, duration, allowed_types]
    if (row.length < 3) continue;

    const clientType = row[0].trim().toLowerCase();
    const duration = parseInt(row[1].trim());
    const allowedTypes = row[2].trim().toLowerCase();

    if (!clientType || isNaN(duration) || !allowedTypes) {
      console.warn(`Skipping invalid rule row: ${row}`);
      continue;
    }

    // No validation needed for client type as we're using the exact value from the sheet

    // Create or update rule with explicit type casting
    await storage.createClientRule({
      clientType,
      duration,
      allowedTypes,
      isActive: true,
    });

    console.log(
      `Added client rule for type: ${clientType}, duration: ${duration}, types: ${allowedTypes}`
    );
  }
}

// Helper function to process client rules data with display names
async function processClientRulesWithDisplayName(rows: any[][]) {
  console.log("Processing client rules with display names");

  // Process each row and create client rules
  for (const row of rows) {
    // Expect row format: [type, duration, allowed_types, display_name]
    if (row.length < 3) continue;

    const clientType = row[0].trim().toLowerCase();
    const duration = parseInt(row[1].trim());
    const allowedTypes = row[2].trim().toLowerCase();
    const displayName = row.length > 3 ? row[3].trim() : null;

    if (!clientType || isNaN(duration) || !allowedTypes) {
      console.warn(`Skipping invalid rule row: ${row}`);
      continue;
    }

    // No client type validation needed as we're using dynamic values from the sheet

    // Create or update rule with explicit type casting
    await storage.createClientRule({
      clientType,
      duration,
      allowedTypes,
      isActive: true,
      displayName: displayName || clientType,
    });

    console.log(
      `Added client rule for type: ${clientType}, duration: ${duration}, types: ${allowedTypes}, display: ${
        displayName || clientType
      }`
    );
  }
}

// Get meeting type header mapping from Google Sheets
async function getMeetingTypeHeaderMapping(): Promise<Record<string, string>> {
  try {
    const { sheets } = setupGoogleClients();
    if (!sheets) {
      // Return default mappings if Google Sheets is not available
      return {
        phone: "טלפון",
        zoom: "זום",
        "in-person": "פגישה",
      };
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("Google Sheet ID not configured");
    }

    const sheetName = "Platforms";

    // Get headers from the sheet
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = headersResponse.data.values?.[0] || [];
    if (headers.length < 3) {
      return {}; // Not enough headers
    }

    // Create a mapping from normalized header names to the original header text
    const mapping: Record<string, string> = {};

    // Process each header starting from index 2 (after ID and client type)
    for (let i = 2; i < headers.length; i++) {
      const headerText = headers[i]?.trim();
      if (!headerText) continue;

      // Normalize the header name to use as a key
      const normalizedName = headerText
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // Add to mapping
      mapping[normalizedName] = headerText;
    }

    return mapping;
  } catch (error) {
    console.error("Error getting meeting type header mapping:", error);
    // Return fallback mapping
    return {
      phone: "טלפון",
      zoom: "זום",
      "in-person": "פגישה",
    };
  }
}

// Create default meeting types
async function createDefaultMeetingTypes() {
  try {
    const existingTypes = await storage.getMeetingTypes();

    if (existingTypes.length > 0) {
      console.log("Using existing meeting types");
      return;
    }

    console.log("Creating default meeting types");

    // Get meeting type headers from the Google Sheet to create proper types
    const { sheets } = setupGoogleClients();
    if (sheets) {
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      if (spreadsheetId) {
        const sheetName = "Platforms";

        // Get headers from the sheet
        const headersResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:Z1`,
        });

        const headers = headersResponse.data.values?.[0] || [];

        if (headers.length >= 3) {
          // Create a type for each meeting type column (starting from index 2)
          for (let i = 2; i < headers.length; i++) {
            const headerText = headers[i]?.trim();
            if (!headerText) continue;

            // Create a meeting type using the original header name
            await storage.createMeetingType({
              name: headerText,
              displayName: headerText,
            });
            console.log(`Created meeting type: ${headerText}`);
          }

          console.log("Meeting types created from sheet headers");
          return;
        }
      }
    }

    // Fallback to default types if Google Sheet is not available
    const types = [
      { name: "טלפון", displayName: "טלפון" },
      { name: "זום", displayName: "זום" },
      { name: "פגישה", displayName: "פגישה" },
    ];

    for (const type of types) {
      await storage.createMeetingType(type);
    }

    console.log("Default meeting types created successfully");
  } catch (error) {
    console.error("Error creating default meeting types:", error);
  }
}

// Sync timeslots from Google Calendar
async function syncWithGoogleCalendar(calendar: calendar_v3.Calendar) {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    console.log("Calendar sync starting with ID:", calendarId);

    if (!calendarId) {
      console.log("No GOOGLE_CALENDAR_ID found in environment variables");
      console.log("Creating sample timeslots instead...");
      await createSampleTimeslots();
      return;
    }

    if (!calendar) {
      console.log("Google Calendar client not initialized");
      console.log("Creating sample timeslots instead...");
      await createSampleTimeslots();
      return;
    }

    console.log("Starting Google Calendar sync with calendar ID:", calendarId);

    // Get events for the next two weeks
    const now = new Date();
    const twoWeeksLater = new Date(now);
    twoWeeksLater.setDate(now.getDate() + 14);

    console.log(
      "Fetching events from",
      now.toISOString(),
      "to",
      twoWeeksLater.toISOString()
    );

    try {
      // Add timeout to the calendar API call
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Calendar API request timed out")),
          10000
        );
      });

      console.log("Making calendar.events.list API call...");
      const responsePromise = calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: twoWeeksLater.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      console.log("Waiting for calendar API response...");
      const response = (await Promise.race([
        responsePromise,
        timeoutPromise,
      ])) as Awaited<typeof responsePromise>;
      console.log("Successfully fetched calendar events");

      const events = response.data.items || [];
      console.log(`Found ${events.length} calendar events`);

      if (events.length === 0) {
        console.log(
          "No events found in calendar, creating sample timeslots..."
        );
        await createSampleTimeslots();
        return;
      }

      // Get available client rules from sheet
      const availableClientRules = await storage.getClientRules();
      console.log(
        `Processing events with ${availableClientRules.length} client rules`
      );

      // Process each event and create timeslots
      for (const event of events) {
        try {
          console.log("Processing event:", event.id, event.summary);

          // Skip events that are already booked
          if (event.summary && event.summary.includes("BOOKED")) {
            console.log("Skipping booked event:", event.id);
            continue;
          }

          // Skip if no description
          if (!event.description) {
            console.log(`Skipping event with no description: ${event.id}`);
            continue;
          }

          // Look for meeting types in description
          const eventDesc = event.description;
          console.log("Event description:", eventDesc);

          const meetingTypes: string[] = [];

          // Get unique meeting types from client rules
          const uniqueMeetingTypes = new Set<string>();
          availableClientRules.forEach((rule) => {
            rule.allowedTypes.split(",").forEach((type) => {
              uniqueMeetingTypes.add(type.trim());
            });
          });

          console.log(
            "Available meeting types:",
            Array.from(uniqueMeetingTypes)
          );

          // Map common English terms to Hebrew meeting types
          const meetingTypeMap: Record<string, string> = {
            phone: "טלפון",
            zoom: "זום",
            meeting: "פגישה",
            "in-person": "פגישה",
            פגישה: "פגישה",
            טלפון: "טלפון",
            זום: "זום",
          };

          // Check for meeting types in description (case insensitive)
          const descriptionLower = eventDesc.toLowerCase();
          Object.entries(meetingTypeMap).forEach(([term, hebrewType]) => {
            if (descriptionLower.includes(term.toLowerCase())) {
              if (Array.from(uniqueMeetingTypes).includes(hebrewType)) {
                meetingTypes.push(hebrewType);
                console.log(
                  `Found meeting type in description: ${term} -> ${hebrewType}`
                );
              }
            }
          });

          if (meetingTypes.length === 0) {
            console.log(
              `No valid meeting types found in description: ${eventDesc}`
            );
            continue;
          }

          // Skip event if it doesn't have valid start/end times
          if (!event.start?.dateTime || !event.end?.dateTime) {
            console.log(`Skipping event with invalid dates: ${event.id}`);
            continue;
          }

          console.log(
            `Creating timeslots for event ${event.id} with types:`,
            meetingTypes
          );

          // Create a timeslot for each client type that has matching meeting types
          for (const rule of availableClientRules) {
            const ruleTypes = rule.allowedTypes.split(",").map((t) => t.trim());
            const matchingTypes = meetingTypes.filter((type) =>
              ruleTypes.includes(type)
            );

            if (matchingTypes.length > 0) {
              // Create timeslot for this client type
              const timeslotData = {
                startTime: new Date(event.start.dateTime),
                endTime: new Date(event.end.dateTime),
                clientType: rule.clientType,
                meetingTypes: matchingTypes.join(","),
                isAvailable: true,
                googleEventId: event.id || null,
                parentEventId: null,
              };

              await storage.createTimeslot(timeslotData);
              console.log(
                `Created timeslot for ${
                  rule.clientType
                } with types: ${matchingTypes.join(",")}`
              );
            }
          }
        } catch (eventError) {
          console.error(`Error processing event ${event.id}:`, eventError);
          // Continue with next event
        }
      }
      console.log("Calendar sync completed successfully");
    } catch (error: any) {
      console.error("Calendar API error:", error);
      if (error?.code === 403) {
        console.log(
          "Full error response:",
          JSON.stringify(error.response?.data || {}, null, 2)
        );
      }
      if (
        error?.code === 403 &&
        error?.errors?.[0]?.reason === "accessNotConfigured"
      ) {
        console.log(
          "Google Calendar API is not enabled. Please enable it in the Google Cloud Console."
        );
        return;
      }
      if (error.message === "Calendar API request timed out") {
        console.error("Calendar sync timed out, continuing without sync");
        return;
      }
      console.error("Error during calendar sync:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in calendar sync:", error);
    console.log("Continuing without Google Calendar integration");
  }
}

// Handle booking in Google Calendar
async function handleBookingInGoogleCalendar(
  calendar: calendar_v3.Calendar,
  timeslot: any,
  booking: any
) {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId || !timeslot.googleEventId) {
      return;
    }

    // Get the original event
    const event = await calendar.events.get({
      calendarId,
      eventId: timeslot.googleEventId,
    });

    if (!event.data) {
      throw new Error("Original event not found in Google Calendar");
    }

    // Get the meeting type display name
    const meetingType = await storage.getMeetingTypeByName(booking.meetingType);
    const meetingTypeDisplay = meetingType
      ? meetingType.displayName
      : booking.meetingType;

    // Delete the original availability event
    await calendar.events.delete({
      calendarId,
      eventId: timeslot.googleEventId,
    });

    // Create a new event for the booking
    const bookingStartTime = new Date(timeslot.startTime);
    const bookingEndTime = new Date(bookingStartTime);
    bookingEndTime.setMinutes(bookingEndTime.getMinutes() + booking.duration);

    const bookingEvent = await calendar.events.insert({
      calendarId,
      sendUpdates: "all",
      requestBody: {
        summary: `BOOKED: Meeting with ${booking.name} (${meetingTypeDisplay})`,
        description: `Booking Details:
Name: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone || "Not provided"}
Notes: ${booking.notes || "None"}
Meeting Type: ${meetingTypeDisplay}`,
        start: {
          dateTime: bookingStartTime.toISOString(),
          timeZone: JERUSALEM_TIMEZONE,
        },
        end: {
          dateTime: bookingEndTime.toISOString(),
          timeZone: JERUSALEM_TIMEZONE,
        },
        attendees: [{ email: booking.email, displayName: booking.name }],
        reminders: {
          useDefault: true,
        },
      },
    });

    // Update the booking with the Google Calendar event ID
    if (bookingEvent.data.id) {
      await calendar.calendarList.get;
      // This would normally update the booking in a database
      booking.googleEventId = bookingEvent.data.id;
    }

    // Create new availability events for leftover time
    const originalStartTime = new Date(timeslot.startTime);
    const originalEndTime = new Date(timeslot.endTime);

    // Check if there's time before the booking
    if (bookingStartTime.getTime() > originalStartTime.getTime()) {
      await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.data.summary,
          description: event.data.description,
          start: {
            dateTime: originalStartTime.toISOString(),
            timeZone: JERUSALEM_TIMEZONE,
          },
          end: {
            dateTime: bookingStartTime.toISOString(),
            timeZone: JERUSALEM_TIMEZONE,
          },
        },
      });
    }

    // Check if there's time after the booking
    if (bookingEndTime.getTime() < originalEndTime.getTime()) {
      await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.data.summary,
          description: event.data.description,
          start: {
            dateTime: bookingEndTime.toISOString(),
            timeZone: JERUSALEM_TIMEZONE,
          },
          end: {
            dateTime: originalEndTime.toISOString(),
            timeZone: JERUSALEM_TIMEZONE,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error handling booking in Google Calendar:", error);
    throw error;
  }
}

/**
 * Create sample timeslots for testing when Google Calendar is not available
 */
async function createSampleTimeslots() {
  try {
    // Clear all existing timeslots to create new diverse samples
    const existingTimeslots = await storage.getTimeslots();
    for (const timeslot of existingTimeslots) {
      await storage.deleteTimeslot(timeslot.id);
    }
    console.log("Cleared existing timeslots to create new diverse samples");

    console.log("Creating diverse sample timeslots for testing");

    // Get available client rules and meeting types
    const clientRules = await storage.getClientRules();
    const meetingTypes = await storage.getMeetingTypes();

    console.log(
      "Available meeting types:",
      meetingTypes.map((t) => t.name).join(", ")
    );

    // Create a map of client types to their meeting options
    interface MeetingOption {
      meetingType: string;
      duration: number;
    }

    const clientMeetingOptions: Record<string, MeetingOption[]> = {};

    // Process client rules to build a mapping of client type to their meeting options
    for (const rule of clientRules) {
      if (!rule.isActive) continue;

      if (!clientMeetingOptions[rule.clientType]) {
        clientMeetingOptions[rule.clientType] = [];
      }

      clientMeetingOptions[rule.clientType].push({
        meetingType: rule.allowedTypes,
        duration: rule.duration,
      });
    }

    console.log(
      "Client meeting options:",
      JSON.stringify(clientMeetingOptions, null, 2)
    );

    // If no client rules found, log and return
    if (Object.keys(clientMeetingOptions).length === 0) {
      console.log("No client rules found, skipping timeslot creation");
      return;
    }

    // Create timeslots for today and next 2 days
    const now = new Date();
    const days = [0, 1, 2]; // Today, tomorrow, day after tomorrow

    // Hour blocks to create timeslots for
    const hourBlocks = [9, 10, 11, 13, 14, 15, 16];

    // For each day
    for (const dayOffset of days) {
      const currentDate = new Date(now);
      currentDate.setDate(currentDate.getDate() + dayOffset);

      // For each hour block
      for (const hour of hourBlocks) {
        const hourStart = new Date(currentDate);
        hourStart.setHours(hour, 0, 0, 0);

        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1, 0, 0, 0);

        // Create specific client type slots
        for (const clientType of Object.keys(clientMeetingOptions)) {
          if (clientType !== "all") {
            // For each meeting option this client type has
            for (const option of clientMeetingOptions[clientType]) {
              // Calculate how many slots we can fit in an hour
              const slotsPerHour = Math.floor(60 / option.duration);

              for (let slotIndex = 0; slotIndex < slotsPerHour; slotIndex++) {
                const slotStart = new Date(hourStart);
                slotStart.setMinutes(
                  slotStart.getMinutes() + slotIndex * option.duration
                );

                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotStart.getMinutes() + option.duration);

                // Only create if within the hour
                if (slotEnd <= hourEnd) {
                  await storage.createTimeslot({
                    startTime: slotStart,
                    endTime: slotEnd,
                    clientType,
                    meetingTypes: option.meetingType,
                    isAvailable: true,
                    googleEventId: null,
                    parentEventId: null,
                  });
                }
              }
            }
          }
        }

        // For "all" client type (side by side different meeting types)
        if (clientMeetingOptions["all"]) {
          // Create a special demonstration hour with side-by-side options (13-14)
          if (hour === 13) {
            // Create time slots with multiple meeting types in the same slot
            // Special time slot with all three meeting types for the 1-2 PM hour
            await storage.createTimeslot({
              startTime: new Date(hourStart),
              endTime: new Date(hourEnd),
              clientType: "all",
              meetingTypes: "טלפון,זום,פגישה", // All three meeting types in one slot
              isAvailable: true,
              googleEventId: null,
              parentEventId: null,
            });

            // Create specialized time slots for VIP clients with two meeting types
            await storage.createTimeslot({
              startTime: new Date(hourStart),
              endTime: new Date(hourEnd),
              clientType: "vip",
              meetingTypes: "זום,פגישה", // Multiple meeting types
              isAvailable: true,
              googleEventId: null,
              parentEventId: null,
            });

            // Create slots for other client types with multiple options
            const halfHourPoint = new Date(hourStart);
            halfHourPoint.setMinutes(halfHourPoint.getMinutes() + 30);

            await storage.createTimeslot({
              startTime: new Date(hourStart),
              endTime: new Date(halfHourPoint),
              clientType: "new_customer",
              meetingTypes: "טלפון,זום", // Two meeting types
              isAvailable: true,
              googleEventId: null,
              parentEventId: null,
            });

            // Create a slot for "פולי אחים" client type with phone and in-person options
            await storage.createTimeslot({
              startTime: new Date(halfHourPoint),
              endTime: new Date(hourEnd),
              clientType: "פולי אחים",
              meetingTypes: "טלפון,פגישה", // Two meeting types
              isAvailable: true,
              googleEventId: null,
              parentEventId: null,
            });
          } else {
            // For other hours, use a simpler pattern
            // Use a mix of meeting types
            const allOptions = clientMeetingOptions["all"];

            // Alternate between meeting types based on hour
            const optionIndex = hour % allOptions.length;
            const option = allOptions[optionIndex];

            // Calculate how many slots we can fit in an hour
            const slotsPerHour = Math.floor(60 / option.duration);

            for (let slotIndex = 0; slotIndex < slotsPerHour; slotIndex++) {
              const slotStart = new Date(hourStart);
              slotStart.setMinutes(
                slotStart.getMinutes() + slotIndex * option.duration
              );

              const slotEnd = new Date(slotStart);
              slotEnd.setMinutes(slotStart.getMinutes() + option.duration);

              // Only create if within the hour
              if (slotEnd <= hourEnd) {
                await storage.createTimeslot({
                  startTime: slotStart,
                  endTime: slotEnd,
                  clientType: "all",
                  meetingTypes: option.meetingType,
                  isAvailable: true,
                  googleEventId: null,
                  parentEventId: null,
                });
              }
            }
          }
        }
      }
    }

    console.log(
      "Sample timeslots created successfully with diverse meeting types and durations"
    );
  } catch (error) {
    console.error("Error creating sample timeslots:", error);
  }
}
