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
    }
  } else {
    console.log(
      "Google Calendar integration not configured. No timeslots will be created."
    );
  }

  // Register API routes
  console.log("Registering API routes...");

  // API routes
  app.get("/api/timeslots", async (req, res) => {
    console.log("[Debug] Timeslots endpoint hit");
    console.log("[Debug] Query params:", req.query);
    console.log("[Debug] Request headers:", req.headers);
    console.log(
      `[Debug] Full request URL: ${req.protocol}://${req.get("host")}${
        req.originalUrl
      }`
    );
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
        console.log(
          `[Debug] Fetching timeslots between ${startDate.toISOString()} and ${endDate.toISOString()}`
        );

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

        console.log("Found", timeslots.length, "available timeslots");
      } else {
        // No date range provided, return all available timeslots
        console.log(
          "No date range provided, returning all available timeslots"
        );
        timeslots = await storage.getTimeslots();
        timeslots = timeslots.filter((ts) => ts.isAvailable);
      }

      console.log(
        `[Debug] Final response has ${timeslots?.length || 0} timeslots`
      );
      if (timeslots?.length > 0) {
        console.log(
          `[Debug] First timeslot in response: ${JSON.stringify(timeslots[0])}`
        );
        console.log(
          `[Debug] Last timeslot in response: ${JSON.stringify(
            timeslots[timeslots.length - 1]
          )}`
        );
      } else {
        console.log(`[Debug] No timeslots found in final response`);
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

  // Helper function to check for events in Google Calendar
  async function checkForEvents(
    calendar: calendar_v3.Calendar,
    days: number = 60
  ): Promise<boolean> {
    try {
      if (!process.env.GOOGLE_CALENDAR_ID) {
        console.error("Google Calendar ID not found in environment variables");
        return false;
      }

      // Calculate start and end dates
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + days);

      console.log(`[Debug] Checking for events in the next ${days} days`);
      console.log(
        `[Debug] Date range: ${startDate} to ${endDate.toISOString()}`
      );

      // Query Google Calendar with minimal fields to improve performance
      const response = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: startDate,
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10, // We only need to know if any events exist
        fields: "items(id,summary)", // Request minimal fields
      });

      // Make sure we have a boolean result
      const hasEvents = Boolean(
        response.data.items && response.data.items.length > 0
      );
      console.log(
        `[Debug] Found ${response.data.items?.length || 0} events in calendar`
      );

      return hasEvents;
    } catch (error) {
      console.error("Error checking for events:", error);
      return false;
    }
  }

  // API endpoint for calendar sync
  app.get("/api/sync-calendar", async (req, res) => {
    console.log("[Debug] Calendar sync endpoint hit");
    try {
      if (!process.env.GOOGLE_CALENDAR_ID) {
        console.log(
          "[Debug] No GOOGLE_CALENDAR_ID found in environment variables"
        );
        return res.status(400).json({
          success: false,
          error: "Google Calendar ID not configured",
        });
      }

      const { calendar } = setupGoogleClients();

      if (!calendar) {
        console.log("[Debug] Google Calendar client not initialized");
        return res.status(500).json({
          success: false,
          error: "Failed to initialize Google Calendar client",
        });
      }

      // First check if events exist in the calendar
      const hasEvents = await checkForEvents(calendar);

      if (!hasEvents) {
        console.log("[Debug] No events found in calendar");
        return res.json({
          success: true,
          message: "No events found in calendar. No timeslots created.",
          timeslotCount: 0,
          usingSampleData: false,
        });
      }

      console.log("[Debug] Starting Google Calendar sync...");

      // Clear existing timeslots before sync
      const existingTimeslots = await storage.getTimeslots();
      console.log(
        `[Debug] Found ${existingTimeslots.length} existing timeslots before sync`
      );

      // Clear existing timeslots
      await storage.clearTimeslots();

      // Perform the sync
      await syncWithGoogleCalendar(calendar);

      // Check results after sync
      const newTimeslots = await storage.getTimeslots();
      console.log(
        `[Debug] After sync: ${newTimeslots.length} timeslots in storage`
      );

      if (newTimeslots.length > 0) {
        // Get date range of available timeslots for debugging
        const startTimes = newTimeslots.map((ts) =>
          new Date(ts.startTime).getTime()
        );
        const earliestTime = new Date(Math.min(...startTimes));
        const latestTime = new Date(Math.max(...startTimes));

        console.log(
          `[Debug] Available timeslots from ${earliestTime.toISOString()} to ${latestTime.toISOString()}`
        );
      }

      res.json({
        success: true,
        message: "Calendar synced successfully",
        timeslotCount: newTimeslots.length,
      });
    } catch (error) {
      console.error("[Debug] Error syncing calendar:", error);
      res.status(500).json({
        success: false,
        error: "Failed to sync calendar",
        message: error instanceof Error ? error.message : "Unknown error",
      });
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

  // Add a debug endpoint to check storage
  app.get("/api/debug/storage-stats", async (req, res) => {
    try {
      const timeslots = await storage.getTimeslots();
      const bookings = await storage.getBookings();
      const clientRules = await storage.getClientRules();
      const meetingTypes = await storage.getMeetingTypes();

      // Count available timeslots
      const availableTimeslots = timeslots.filter(
        (ts) => ts.isAvailable
      ).length;

      // Group timeslots by date
      const timeslotsByDate: Record<string, number> = {};
      timeslots.forEach((ts) => {
        const date = new Date(ts.startTime).toISOString().split("T")[0];
        timeslotsByDate[date] = (timeslotsByDate[date] || 0) + 1;
      });

      // Count timeslots by client type
      const timeslotsByClientType: Record<string, number> = {};
      timeslots.forEach((ts) => {
        timeslotsByClientType[ts.clientType] =
          (timeslotsByClientType[ts.clientType] || 0) + 1;
      });

      // Get date range of timeslots
      let earliestDate = new Date();
      let latestDate = new Date(0);

      timeslots.forEach((ts) => {
        const startDate = new Date(ts.startTime);
        const endDate = new Date(ts.endTime);

        if (startDate < earliestDate) earliestDate = startDate;
        if (endDate > latestDate) latestDate = endDate;
      });

      res.json({
        counts: {
          timeslots: timeslots.length,
          availableTimeslots,
          bookings: bookings.length,
          clientRules: clientRules.length,
          meetingTypes: meetingTypes.length,
        },
        dateRange: {
          earliest: earliestDate.toISOString(),
          latest: latestDate.toISOString(),
        },
        timeslotsByDate,
        timeslotsByClientType,
        sampleTimeslots: timeslots.slice(0, Math.min(5, timeslots.length)),
        storage: {
          timeslotsCount: timeslots.length,
        },
      });
    } catch (error) {
      console.error("Error getting storage stats:", error);
      res.status(500).json({ error: "Failed to get storage stats" });
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

// Sync with Google Calendar
async function syncWithGoogleCalendar(
  calendarClient: calendar_v3.Calendar
): Promise<void> {
  try {
    console.log("[Debug] Starting calendar sync");

    // Get events for the next three months instead of just two weeks
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(now.getMonth() + 3);

    console.log(
      `[Debug] Fetching events from ${now.toISOString()} to ${threeMonthsLater.toISOString()}`
    );

    // First clear existing timeslots before sync to prevent duplicates
    try {
      console.log("[Debug] Clearing existing timeslots");
      await storage.clearTimeslots();
      console.log("[Debug] Successfully cleared existing timeslots");
    } catch (clearError) {
      console.error("[Debug] Error clearing timeslots:", clearError);
      // Continue with sync anyway
    }

    const response = await calendarClient.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      timeMin: now.toISOString(),
      timeMax: threeMonthsLater.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    console.log(
      `[Debug] Retrieved ${events.length} events from Google Calendar`
    );

    let convertedCount = 0;
    let errorCount = 0;

    // Process each event
    for (const event of events) {
      try {
        if (!event.start?.dateTime || !event.end?.dateTime) {
          console.log(
            `[Debug] Skipping event without dateTime: ${event.summary}`
          );
          continue;
        }

        // Get client type and allowed meeting types from event description or summary
        const clientType = extractClientType(event);
        const meetingTypes = extractMeetingTypes(event);

        console.log(
          `[Debug] Processing event: ${event.summary}, Client: ${clientType}, Meeting types: ${meetingTypes}`
        );

        // Create a timeslot from the event
        await storage.createTimeslot({
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          clientType,
          meetingTypes,
          isAvailable: true,
          googleEventId: event.id || null,
          parentEventId: null,
        });

        convertedCount++;
      } catch (error) {
        console.error(`[Debug] Error processing event ${event.id}: ${error}`);
        errorCount++;
      }
    }

    console.log(
      `[Debug] Calendar sync completed. Converted: ${convertedCount}, Errors: ${errorCount}`
    );

    // Verify timeslots after sync
    const timeslots = await storage.getTimeslots();
    console.log(`[Debug] Total timeslots after sync: ${timeslots.length}`);

    if (timeslots.length > 0) {
      const firstTimeslot = timeslots[0];
      console.log(`[Debug] First timeslot: ${JSON.stringify(firstTimeslot)}`);
    }
  } catch (error) {
    console.error("[Debug] Error in syncWithGoogleCalendar:", error);
    throw error;
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

// Helper function to extract client type from event
function extractClientType(event: calendar_v3.Schema$Event): string {
  // Default to 'all' if we can't determine the client type
  let clientType = "all";

  // Check description first
  if (event.description) {
    const descLower = event.description.toLowerCase();
    if (descLower.includes("עסקי") || descLower.includes("business")) {
      return "עסקי";
    }
    if (descLower.includes("פרטי") || descLower.includes("private")) {
      return "פרטי";
    }
  }

  // Then check summary
  if (event.summary) {
    const summaryLower = event.summary.toLowerCase();
    if (summaryLower.includes("עסקי") || summaryLower.includes("business")) {
      return "עסקי";
    }
    if (summaryLower.includes("פרטי") || summaryLower.includes("private")) {
      return "פרטי";
    }
  }

  return clientType;
}

// Helper function to extract meeting types from event
function extractMeetingTypes(event: calendar_v3.Schema$Event): string {
  const meetingTypes: string[] = [];

  // Check in both description and summary
  const textToCheck = [event.description || "", event.summary || ""]
    .join(" ")
    .toLowerCase();

  // Map of keywords to meeting types
  const typeMap: Record<string, string> = {
    טלפון: "טלפון",
    phone: "טלפון",
    call: "טלפון",
    זום: "זום",
    zoom: "זום",
    video: "זום",
    פגישה: "פגישה",
    meeting: "פגישה",
    "in-person": "פגישה",
    face: "פגישה",
  };

  // Check for each keyword
  Object.entries(typeMap).forEach(([keyword, meetingType]) => {
    if (textToCheck.includes(keyword)) {
      meetingTypes.push(meetingType);
    }
  });

  // If no types found, allow all types
  if (meetingTypes.length === 0) {
    return "טלפון,זום,פגישה";
  }

  return meetingTypes
    .filter((value, index, self) => self.indexOf(value) === index)
    .join(",");
}
