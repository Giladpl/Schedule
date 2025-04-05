import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema from original file preserved
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Enhanced schemas for the scheduling system
// We don't restrict client types to predefined values - using text field instead
// export const clientTypeEnum = pgEnum("client_type", ["new", "vip", "quick", "all"]);
export const meetingTypeEnum = pgEnum("meeting_type", [
  "zoom",
  "phone",
  "in-person",
]);

// Schema for meeting types
export const meetingTypes = pgTable("meeting_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
});

export const insertMeetingTypeSchema = createInsertSchema(meetingTypes).omit({
  id: true,
});

export type InsertMeetingType = z.infer<typeof insertMeetingTypeSchema>;
export type MeetingType = typeof meetingTypes.$inferSelect;

// Schema for client rules
export const clientRules = pgTable("client_rules", {
  id: serial("id").primaryKey(),
  clientType: text("client_type").notNull(),
  duration: integer("duration").notNull(), // in minutes
  allowedTypes: text("allowed_types").notNull(), // comma-separated meeting types
  isActive: boolean("is_active").notNull().default(true),
  displayName: text("display_name"), // Optional display name (e.g., for Hebrew names)
  rowId: integer("row_id"), // ID from Google Sheet (column A)
});

// Helper type for runtime use
export type ClientRuleWithDisplayName = {
  id: number;
  clientType: string; // Now accepts any string value from the sheet
  duration: number;
  allowedTypes: string;
  isActive: boolean;
  displayName: string | null;
  rowId: number | null; // ID from Google Sheet
};

export const insertClientRuleSchema = createInsertSchema(clientRules).omit({
  id: true,
});

export type InsertClientRule = z.infer<typeof insertClientRuleSchema>;
export type ClientRule = typeof clientRules.$inferSelect;

// Enhanced timeslots schema
export const timeslots = pgTable("timeslots", {
  id: serial("id").primaryKey(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  clientType: text("client_type").notNull().default("all"),
  meetingTypes: text("meeting_types").notNull(), // comma-separated meeting types
  isAvailable: boolean("is_available").notNull().default(true),
  googleEventId: text("google_event_id"),
  parentEventId: text("parent_event_id"), // To track original event for split slots
});

export const insertTimeslotSchema = createInsertSchema(timeslots).omit({
  id: true,
});

export type InsertTimeslot = z.infer<typeof insertTimeslotSchema>;
export type Timeslot = {
  id: number;
  startTime: Date;
  endTime: Date;
  clientType: string;
  meetingTypes: string;
  isAvailable: boolean;
  googleEventId: string | null;
  parentEventId: string | null;
  // Add new properties for adjusted timeslots
  wasAdjusted?: boolean;
  remainingMinutes?: number;
};

// Enhanced bookings schema
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  timeslotId: integer("timeslot_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  meetingType: text("meeting_type").notNull(),
  duration: integer("duration").notNull(), // in minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  googleEventId: text("google_event_id"),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  googleEventId: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Extended schemas for validation
export const bookingFormSchema = insertBookingSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  meetingType: z.string().min(1, "Meeting type is required"),
  duration: z.number().int().positive("Duration must be a positive number"),
  startTime: z.date().optional(),
});
