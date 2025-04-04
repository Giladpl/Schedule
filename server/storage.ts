import {
  type Booking,
  type ClientRule,
  type InsertBooking,
  type InsertClientRule,
  type InsertMeetingType,
  type InsertTimeslot,
  type InsertUser,
  type MeetingType,
  type Timeslot,
  type User,
} from "@shared/schema";

// Extend the storage interface with CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Timeslot methods
  getTimeslots(): Promise<Timeslot[]>;
  getTimeslotsByDate(date: Date): Promise<Timeslot[]>;
  getTimeslotsByDateRange(startDate: Date, endDate: Date): Promise<Timeslot[]>;
  getTimeslotsByClientType(clientType: string): Promise<Timeslot[]>;
  getTimeslotsByMeetingType(meetingType: string): Promise<Timeslot[]>;
  getTimeslotsByClientAndMeetingType(
    clientType: string,
    meetingType: string
  ): Promise<Timeslot[]>;
  getTimeslotById(id: number): Promise<Timeslot | undefined>;
  createTimeslot(timeslot: InsertTimeslot): Promise<Timeslot>;
  updateTimeslot(
    id: number,
    timeslot: Partial<InsertTimeslot>
  ): Promise<Timeslot | undefined>;
  deleteTimeslot(id: number): Promise<boolean>;
  createTimeslotsForSlotSplit(
    originalId: number,
    bookingStart: Date,
    bookingEnd: Date
  ): Promise<Timeslot[]>;
  clearTimeslots(): Promise<void>;

  // Booking methods
  getBookings(): Promise<Booking[]>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingsByTimeslotId(timeslotId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;

  // Client rule methods
  getClientRules(): Promise<ClientRule[]>;
  getClientRuleByType(clientType: string): Promise<ClientRule | undefined>;
  createClientRule(rule: InsertClientRule): Promise<ClientRule>;
  updateClientRule(
    id: number,
    rule: Partial<InsertClientRule>
  ): Promise<ClientRule | undefined>;
  deleteClientRule(id: number): Promise<boolean>;

  // Meeting type methods
  getMeetingTypes(): Promise<MeetingType[]>;
  getMeetingTypeByName(name: string): Promise<MeetingType | undefined>;
  createMeetingType(type: InsertMeetingType): Promise<MeetingType>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private timeslots: Map<number, Timeslot>;
  private bookings: Map<number, Booking>;
  private clientRules: Map<number, ClientRule>;
  private meetingTypes: Map<number, MeetingType>;

  private userCurrentId: number;
  private timeslotCurrentId: number;
  private bookingCurrentId: number;
  private clientRuleCurrentId: number;
  private meetingTypeCurrentId: number;

  constructor() {
    this.users = new Map();
    this.timeslots = new Map();
    this.bookings = new Map();
    this.clientRules = new Map();
    this.meetingTypes = new Map();

    this.userCurrentId = 1;
    this.timeslotCurrentId = 1;
    this.bookingCurrentId = 1;
    this.clientRuleCurrentId = 1;
    this.meetingTypeCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Timeslot methods
  async getTimeslots(): Promise<Timeslot[]> {
    try {
      // Ensure timeslots is a Map
      if (!(this.timeslots instanceof Map)) {
        console.log(
          "[Debug] timeslots is not a Map in getTimeslots, re-initializing"
        );
        this.timeslots = new Map();
        return [];
      }

      const result = Array.from(this.timeslots.values());
      console.log(
        `[Debug] getTimeslots: Returning ${result.length} total timeslots`
      );

      if (result.length > 0) {
        const available = result.filter((ts) => ts.isAvailable).length;
        console.log(
          `[Debug] Available timeslots: ${available} out of ${result.length}`
        );

        // Log a few sample timeslots
        const samples = result.slice(0, Math.min(3, result.length));
        samples.forEach((ts, i) => {
          console.log(`[Debug] Sample timeslot ${i}:`, {
            id: ts.id,
            startTime: new Date(ts.startTime).toISOString(),
            endTime: new Date(ts.endTime).toISOString(),
            clientType: ts.clientType,
            meetingTypes: ts.meetingTypes,
            isAvailable: ts.isAvailable,
          });
        });
      }

      return result;
    } catch (error) {
      console.error("[Debug] Error in getTimeslots:", error);
      // Return empty array if there's an error
      return [];
    }
  }

  async getTimeslotsByDate(date: Date): Promise<Timeslot[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.timeslots.values()).filter(
      (timeslot) =>
        new Date(timeslot.startTime) >= startOfDay &&
        new Date(timeslot.endTime) <= endOfDay &&
        timeslot.isAvailable
    );
  }

  async getTimeslotsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Timeslot[]> {
    try {
      console.log(
        `[Debug] getTimeslotsByDateRange: ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      // Check if the date range includes Saturday - improved logic
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();
      const dayDuration = 24 * 60 * 60 * 1000; // One day in milliseconds
      let currentMs = startMs;
      let hasSaturday = false;
      const daysOfWeek: number[] = [];

      while (currentMs <= endMs) {
        const currentDate = new Date(currentMs);
        const dayOfWeek = currentDate.getDay();
        if (!daysOfWeek.includes(dayOfWeek)) {
          daysOfWeek.push(dayOfWeek);
        }
        if (dayOfWeek === 6) {
          // 6 = Saturday
          hasSaturday = true;
          console.log(
            `[Debug] Saturday found in range: ${currentDate.toISOString()}`
          );
        }
        currentMs += dayDuration;
      }

      console.log(
        `[Debug] Date range includes these days of week: ${daysOfWeek.join(
          ", "
        )}`
      );
      console.log(`[Debug] Date range includes Saturday: ${hasSaturday}`);

      // Ensure timeslots is a Map
      if (!(this.timeslots instanceof Map)) {
        console.log(
          "[Debug] timeslots is not a Map in getTimeslotsByDateRange, re-initializing"
        );
        this.timeslots = new Map();
        return [];
      }

      const allTimeslots = Array.from(this.timeslots.values());
      console.log(`[Debug] Total timeslots in storage: ${allTimeslots.length}`);

      // Check for Saturday timeslots in storage
      const saturdayTimeslots = allTimeslots.filter((ts) => {
        const date = new Date(ts.startTime);
        return date.getDay() === 6;
      });

      console.log(
        `[Debug] Saturday timeslots in storage: ${saturdayTimeslots.length}`
      );

      if (saturdayTimeslots.length > 0) {
        console.log(
          `[Debug] Sample Saturday timeslot: ${JSON.stringify(
            saturdayTimeslots[0]
          )}`
        );
      }

      // Get a few sample timeslots to see what's in storage
      const sampleTimeslots = allTimeslots.slice(
        0,
        Math.min(3, allTimeslots.length)
      );
      if (sampleTimeslots.length > 0) {
        console.log(`[Debug] Sample timeslots in storage:`);
        sampleTimeslots.forEach((ts, i) => {
          const date = new Date(ts.startTime);
          console.log(
            `[Debug] Timeslot ${i}: ${new Date(
              ts.startTime
            ).toISOString()} to ${new Date(
              ts.endTime
            ).toISOString()}, isAvailable: ${
              ts.isAvailable
            }, day of week: ${date.getDay()}`
          );
        });
      }

      // Improved date comparison for more accurate matching
      // First filter only by date range without availability check
      const dateMatchedTimeslots = allTimeslots.filter((timeslot) => {
        const slotStartTime = new Date(timeslot.startTime).getTime();
        const slotEndTime = new Date(timeslot.endTime).getTime();

        // A timeslot is in range if it starts after or at startDate
        // AND ends before or at endDate
        const inRange = slotStartTime >= startMs && slotEndTime <= endMs;

        // For debug, log Saturday timeslots that are being filtered out
        const isSaturday = new Date(timeslot.startTime).getDay() === 6;
        if (isSaturday) {
          console.log(
            `[Debug] Saturday timeslot (${new Date(
              timeslot.startTime
            ).toISOString()}) in range: ${inRange}`
          );
        }

        return inRange;
      });

      console.log(
        `[Debug] Found ${dateMatchedTimeslots.length} timeslots matching date range before availability check`
      );

      // Check for Saturday timeslots in date-matched results
      const dateMatchedSaturdayTimeslots = dateMatchedTimeslots.filter((ts) => {
        const date = new Date(ts.startTime);
        return date.getDay() === 6;
      });

      console.log(
        `[Debug] Saturday timeslots after date filter: ${dateMatchedSaturdayTimeslots.length}`
      );

      // Then apply availability filter
      const result = dateMatchedTimeslots.filter(
        (timeslot) => timeslot.isAvailable
      );
      console.log(
        `[Debug] Returning ${result.length} available timeslots within date range`
      );

      // Final check for Saturday timeslots in results
      const resultSaturdayTimeslots = result.filter((ts) => {
        const date = new Date(ts.startTime);
        return date.getDay() === 6;
      });

      console.log(
        `[Debug] Saturday timeslots in final result: ${resultSaturdayTimeslots.length}`
      );

      return result;
    } catch (error) {
      console.error("[Debug] Error in getTimeslotsByDateRange:", error);
      return [];
    }
  }

  async getTimeslotsByClientType(clientType: string): Promise<Timeslot[]> {
    if (clientType === "all") {
      return this.getTimeslots().then((slots) =>
        slots.filter((s) => s.isAvailable)
      );
    }

    return Array.from(this.timeslots.values()).filter(
      (timeslot) =>
        (timeslot.clientType === clientType || timeslot.clientType === "all") &&
        timeslot.isAvailable
    );
  }

  async getTimeslotsByMeetingType(meetingType: string): Promise<Timeslot[]> {
    return Array.from(this.timeslots.values()).filter(
      (timeslot) =>
        timeslot.meetingTypes.includes(meetingType) && timeslot.isAvailable
    );
  }

  async getTimeslotsByClientAndMeetingType(
    clientType: string,
    meetingType: string
  ): Promise<Timeslot[]> {
    return Array.from(this.timeslots.values()).filter(
      (timeslot) =>
        (timeslot.clientType === clientType || timeslot.clientType === "all") &&
        timeslot.meetingTypes.includes(meetingType) &&
        timeslot.isAvailable
    );
  }

  async getTimeslotById(id: number): Promise<Timeslot | undefined> {
    return this.timeslots.get(id);
  }

  async createTimeslot(insertTimeslot: InsertTimeslot): Promise<Timeslot> {
    try {
      // Ensure timeslots is a Map
      if (!(this.timeslots instanceof Map)) {
        console.log(
          "[Debug] timeslots is not a Map in createTimeslot, re-initializing"
        );
        this.timeslots = new Map();
      }

      const id = this.timeslotCurrentId++;

      // Ensure all required fields have values
      const timeslot: Timeslot = {
        ...insertTimeslot,
        id,
        clientType: insertTimeslot.clientType || "all",
        meetingTypes: insertTimeslot.meetingTypes || "",
        isAvailable: insertTimeslot.isAvailable ?? true,
        googleEventId: insertTimeslot.googleEventId || null,
        parentEventId: insertTimeslot.parentEventId || null,
      };

      this.timeslots.set(id, timeslot);
      return timeslot;
    } catch (error) {
      console.error("[Debug] Error in createTimeslot:", error);
      throw new Error(
        `Failed to create timeslot: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async updateTimeslot(
    id: number,
    timeslotData: Partial<InsertTimeslot>
  ): Promise<Timeslot | undefined> {
    const existingTimeslot = this.timeslots.get(id);

    if (!existingTimeslot) {
      return undefined;
    }

    const updatedTimeslot = { ...existingTimeslot, ...timeslotData };
    this.timeslots.set(id, updatedTimeslot);

    return updatedTimeslot;
  }

  async deleteTimeslot(id: number): Promise<boolean> {
    return this.timeslots.delete(id);
  }

  async clearTimeslots(): Promise<void> {
    console.log("[Debug] Clearing all timeslots from storage");
    try {
      // Re-initialize the map if it's not a Map
      if (!(this.timeslots instanceof Map)) {
        console.log("[Debug] timeslots is not a Map, re-initializing");
        this.timeslots = new Map();
      } else {
        this.timeslots.clear();
      }
      console.log("[Debug] Timeslots cleared successfully");
    } catch (error) {
      console.error("[Debug] Error clearing timeslots:", error);
      // Ensure we have a valid Map
      this.timeslots = new Map();
    }
  }

  async createTimeslotsForSlotSplit(
    originalId: number,
    bookingStart: Date,
    bookingEnd: Date
  ): Promise<Timeslot[]> {
    const original = await this.getTimeslotById(originalId);
    if (!original) {
      throw new Error("Original timeslot not found for splitting");
    }

    const originalStart = new Date(original.startTime);
    const originalEnd = new Date(original.endTime);
    const newSlots: Timeslot[] = [];

    // Create before slot if there's time before the booking
    if (bookingStart.getTime() > originalStart.getTime()) {
      const beforeSlot = await this.createTimeslot({
        startTime: originalStart,
        endTime: bookingStart,
        clientType: original.clientType,
        meetingTypes: original.meetingTypes,
        isAvailable: true,
        parentEventId: original.googleEventId,
      });
      newSlots.push(beforeSlot);
    }

    // Create after slot if there's time after the booking
    if (bookingEnd.getTime() < originalEnd.getTime()) {
      const afterSlot = await this.createTimeslot({
        startTime: bookingEnd,
        endTime: originalEnd,
        clientType: original.clientType,
        meetingTypes: original.meetingTypes,
        isAvailable: true,
        parentEventId: original.googleEventId,
      });
      newSlots.push(afterSlot);
    }

    return newSlots;
  }

  // Booking methods
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByTimeslotId(timeslotId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.timeslotId === timeslotId
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.bookingCurrentId++;

    // Ensure all required fields have values
    const booking: Booking = {
      ...insertBooking,
      id,
      createdAt: new Date(),
      googleEventId: null,
      phone: insertBooking.phone || null,
      notes: insertBooking.notes || null,
    };

    this.bookings.set(id, booking);

    // Get the timeslot that's being booked
    const timeslot = this.timeslots.get(insertBooking.timeslotId);
    if (!timeslot) {
      throw new Error("Timeslot not found");
    }

    // The duration should be passed in the booking data
    const bookingStart = new Date(timeslot.startTime);
    const bookingEnd = new Date(bookingStart);
    bookingEnd.setMinutes(bookingEnd.getMinutes() + insertBooking.duration);

    // Create slots before and after the booking if necessary
    await this.createTimeslotsForSlotSplit(
      timeslot.id,
      bookingStart,
      bookingEnd
    );

    // Mark the original timeslot as unavailable
    await this.updateTimeslot(timeslot.id, { isAvailable: false });

    return booking;
  }

  // Client rule methods
  async getClientRules(): Promise<ClientRule[]> {
    return Array.from(this.clientRules.values());
  }

  async getClientRuleByType(
    clientType: string
  ): Promise<ClientRule | undefined> {
    return Array.from(this.clientRules.values()).find(
      (rule) => rule.clientType === clientType && rule.isActive
    );
  }

  async createClientRule(rule: InsertClientRule): Promise<ClientRule> {
    const id = this.clientRuleCurrentId++;

    // Ensure isActive field has a value and displayName is null if not provided
    const clientRule: ClientRule = {
      ...rule,
      id,
      isActive: rule.isActive ?? true,
      displayName: rule.displayName ?? null,
    };

    this.clientRules.set(id, clientRule);
    return clientRule;
  }

  async updateClientRule(
    id: number,
    ruleData: Partial<InsertClientRule>
  ): Promise<ClientRule | undefined> {
    const existingRule = this.clientRules.get(id);

    if (!existingRule) {
      return undefined;
    }

    const updatedRule = { ...existingRule, ...ruleData };
    this.clientRules.set(id, updatedRule);

    return updatedRule;
  }

  async deleteClientRule(id: number): Promise<boolean> {
    return this.clientRules.delete(id);
  }

  // Meeting type methods
  async getMeetingTypes(): Promise<MeetingType[]> {
    return Array.from(this.meetingTypes.values());
  }

  async getMeetingTypeByName(name: string): Promise<MeetingType | undefined> {
    return Array.from(this.meetingTypes.values()).find(
      (type) => type.name.toLowerCase() === name.toLowerCase()
    );
  }

  async createMeetingType(type: InsertMeetingType): Promise<MeetingType> {
    const id = this.meetingTypeCurrentId++;
    const meetingType: MeetingType = { ...type, id };
    this.meetingTypes.set(id, meetingType);
    return meetingType;
  }
}

export const storage = new MemStorage();
