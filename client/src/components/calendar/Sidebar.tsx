import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  MultiSelectOption,
  SimpleMultiSelect,
} from "@/components/ui/simple-multi-select";
import { fetchClientData, refreshClientRules } from "@/lib/calendarService";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Phone, RefreshCcw, Users, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Default meeting types if we can't fetch them from server
const DEFAULT_MEETING_TYPES = ["טלפון", "זום", "פגישה"];

// Meeting type styles for the legend
const MEETING_TYPE_STYLES: Record<string, { color: string; icon: any }> = {
  טלפון: { color: "#34a853", icon: Phone },
  זום: { color: "#4285f4", icon: Video },
  פגישה: { color: "#ea4335", icon: Users },
  default: { color: "#fbbc04", icon: null },
};

// Client type colors for the legend
const CLIENT_TYPE_COLORS: Record<string, string> = {
  new_customer: "#9c27b0", // Purple
  "פולי אחים": "#2196f3", // Blue
  "מדריכים+": "#ff9800", // Orange
  "מכירת עוגות": "#4caf50", // Green
  all: "#607d8b", // Gray-Blue
  default: "#9e9e9e", // Gray
};

interface SidebarProps {
  clientTypes: string[];
  onClientTypeChange: (values: string[]) => void;
  meetingTypes: string[];
  onMeetingTypeChange: (values: string[]) => void;
  isAdmin?: boolean;
  viewMode?: "admin" | "client";
}

// Type definition for meetingTypes that can come in different formats
type MeetingTypeFromAPI = string | { name: string; duration?: number };

// Helper function to normalize meeting types from different formats
function normalizeMeetingTypes(meetingTypes: any): string[] {
  if (!meetingTypes) return DEFAULT_MEETING_TYPES;

  if (Array.isArray(meetingTypes)) {
    if (meetingTypes.length === 0) return DEFAULT_MEETING_TYPES;

    // If the array contains objects with name properties
    if (typeof meetingTypes[0] === "object" && meetingTypes[0]?.name) {
      return meetingTypes.map((mt) => mt.name);
    }

    // If it's already a string array
    if (typeof meetingTypes[0] === "string") {
      return meetingTypes as string[];
    }
  }

  return DEFAULT_MEETING_TYPES;
}

export default function Sidebar({
  clientTypes,
  onClientTypeChange,
  meetingTypes,
  onMeetingTypeChange,
  isAdmin = false,
  viewMode = "admin",
}: SidebarProps) {
  // Add a state for tracking refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to refresh sheet data
  const refreshSheetData = async () => {
    try {
      setIsRefreshing(true);
      console.log("Refreshing data from Google Sheets...");

      // Call the API to refresh data from Google Sheets
      await refreshClientRules();

      // After sheet refresh, invalidate the client data query to force a refresh
      queryClient.invalidateQueries({ queryKey: ["/api/client-data"] });

      console.log("Sheet data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing sheet data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Effect to refresh data from Google Sheets when component mounts
  useEffect(() => {
    // Refresh data from Google Sheets on initial load
    refreshSheetData();
  }, []);

  // Fetch client data from API
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Function to get available meeting types based on client types
  const availableMeetingTypes = useMemo((): string[] => {
    // Default meeting types as fallback
    if (!data || !data.clients || data.clients.length === 0) {
      return DEFAULT_MEETING_TYPES;
    }

    // If 'all' is selected or in admin view, collect all meeting types from all clients
    if (clientTypes.includes("all") && viewMode === "admin") {
      // If data.meetingTypes is available, use it
      if (data.meetingTypes) {
        return normalizeMeetingTypes(data.meetingTypes);
      }

      // Otherwise, extract meeting types from all clients
      const allMeetingTypes = new Set<string>();
      data.clients.forEach((client) => {
        if (client.meetings) {
          Object.keys(client.meetings).forEach((meetingType) => {
            allMeetingTypes.add(meetingType);
          });
        }
      });

      // Convert set to array
      if (allMeetingTypes.size > 0) {
        return Array.from(allMeetingTypes);
      }

      return DEFAULT_MEETING_TYPES;
    }

    // If multiple client types are selected, combine their meeting types
    if (clientTypes.length > 0) {
      const allMeetingTypes = new Set<string>();

      // For each client type, find its meeting types and add to the set
      clientTypes.forEach((clientType) => {
        let selectedClient = null;

        // First try to match by numeric ID if clientType is a number
        if (!isNaN(parseInt(clientType))) {
          const numericId = parseInt(clientType);
          selectedClient = data.clients.find(
            (client) => client.id === numericId
          );
        }

        // If no match by ID, try to match by type name
        if (!selectedClient) {
          selectedClient = data.clients.find(
            (client) => client.type === clientType
          );
        }

        // Legacy fallback: try first letter matching
        if (!selectedClient && clientType.length === 1) {
          selectedClient = data.clients.find((client) =>
            client.type.startsWith(clientType)
          );
        }

        // Add meeting types from the matching client
        if (selectedClient && selectedClient.meetings) {
          Object.keys(selectedClient.meetings).forEach((meetingType) => {
            allMeetingTypes.add(meetingType);
          });
        }
      });

      // Convert set to array
      if (allMeetingTypes.size > 0) {
        return Array.from(allMeetingTypes);
      }
    }

    // Fallback to all meeting types
    console.log(
      `[Debug] Sidebar: Using fallback meeting types for clientTypes ${clientTypes.join(
        ","
      )}`
    );

    // Try to extract all meeting types from clients as a fallback
    const allMeetingTypes = new Set<string>();
    data.clients.forEach((client) => {
      if (client.meetings) {
        Object.keys(client.meetings).forEach((meetingType) => {
          allMeetingTypes.add(meetingType);
        });
      }
    });

    if (allMeetingTypes.size > 0) {
      return Array.from(allMeetingTypes);
    }

    return DEFAULT_MEETING_TYPES;
  }, [data, clientTypes, viewMode]);

  // Prepare options for MultiSelect components
  const clientTypeOptions = useMemo<MultiSelectOption[]>(() => {
    if (!data || !data.clients) return [{ value: "all", label: "הכל" }];

    return [
      { value: "all", label: "הכל" },
      ...data.clients.map((client) => {
        // Use the client.type directly for the label, which is the proper display name from the server
        // Use the client ID as the value if available, otherwise use the type
        return {
          // If ID exists, use it as the value, otherwise use the type
          value: client.id !== undefined ? `${client.id}` : client.type,
          // Use the original type name directly from the server as the label
          label: client.type,
        };
      }),
    ];
  }, [data]);

  const meetingTypeOptions = useMemo<MultiSelectOption[]>(() => {
    // Get only meeting types that are applicable to the selected client types
    let applicableMeetingTypes = availableMeetingTypes;

    // If specific client types are selected (not "all"), only show meeting types available for those clients
    if (
      !clientTypes.includes("all") &&
      clientTypes.length > 0 &&
      data?.clients
    ) {
      const allowedMeetingTypes = new Set<string>();

      // For each selected client type, add its available meeting types
      clientTypes.forEach((clientType) => {
        // Find the client - first try by ID, then by type name
        const client = data.clients.find(
          (c) =>
            (c.id !== undefined && c.id.toString() === clientType) ||
            c.type === clientType
        );

        // If client found, add all its meeting types
        if (client && client.meetings) {
          Object.keys(client.meetings).forEach((type) => {
            allowedMeetingTypes.add(type);
          });
        }
      });

      // Filter to only meeting types applicable to selected client types
      if (allowedMeetingTypes.size > 0) {
        applicableMeetingTypes = applicableMeetingTypes.filter((type) =>
          allowedMeetingTypes.has(type)
        );
      }
    }

    return [
      { value: "all", label: "הכל" },
      ...applicableMeetingTypes.map((type) => ({
        value: type,
        label: type,
      })),
    ];
  }, [availableMeetingTypes, clientTypes, data]);

  // Get client types for admin legend
  const legendClientTypes = useMemo(() => {
    if (!data || !data.clients) return [];
    return [
      ...data.clients.map((client) => ({
        id: client.id !== undefined ? `${client.id}` : client.type,
        type: client.type,
      })),
    ];
  }, [data]);

  return (
    <div
      className="w-64 border-r border-[#dadce0] p-4 h-full overflow-auto shrink-0 hidden md:block"
      dir="rtl"
    >
      <Card className="mb-6 border-0 shadow-none">
        <CardHeader className="p-0 pb-2">
          <h2 className="text-lg font-medium text-[#3c4043]">סינון פגישות</h2>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {viewMode === "admin" && (
            <div className="space-y-1.5">
              <Label
                htmlFor="clientType"
                className="text-sm font-medium text-[#5f6368]"
              >
                סוג לקוח
              </Label>
              <SimpleMultiSelect
                options={clientTypeOptions}
                selected={clientTypes}
                onChange={onClientTypeChange}
                placeholder="בחר סוג לקוח"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="meetingType"
              className="text-sm font-medium text-[#5f6368]"
            >
              סוג פגישה
            </Label>
            <SimpleMultiSelect
              options={meetingTypeOptions}
              selected={meetingTypes}
              onChange={onMeetingTypeChange}
              placeholder="בחר סוג פגישה"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Meeting Types Legend */}
      <Card className="border-0 shadow-none mb-6">
        <CardHeader className="p-0 pb-2">
          <h2 className="text-lg font-medium text-[#3c4043]">מקרא</h2>
        </CardHeader>
        <CardContent className="p-0 text-sm text-[#5f6368]">
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#5f6368]">סוגי פגישות:</h3>
            <div className="flex items-center mb-2">
              <div
                className="w-5 h-5 rounded-sm ml-3 flex items-center justify-center text-white"
                style={{ backgroundColor: "#34a853" }}
              >
                <Phone size={14} />
              </div>
              <span className="text-sm">טלפון (Phone)</span>
            </div>
            <div className="flex items-center mb-2">
              <div
                className="w-5 h-5 rounded-sm ml-3 flex items-center justify-center text-white"
                style={{ backgroundColor: "#4285f4" }}
              >
                <Video size={14} />
              </div>
              <span className="text-sm">זום (Zoom)</span>
            </div>
            <div className="flex items-center mb-2">
              <div
                className="w-5 h-5 rounded-sm ml-3 flex items-center justify-center text-white"
                style={{ backgroundColor: "#ea4335" }}
              >
                <Users size={14} />
              </div>
              <span className="text-sm">פגישה (In-person)</span>
            </div>

            {/* Client Types Legend - Only shown in admin view */}
            {viewMode === "admin" && legendClientTypes.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-[#5f6368] mt-4">
                  סוגי לקוחות:
                </h3>
                {legendClientTypes.map((client, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <div
                      className="w-5 h-5 rounded-sm ml-3"
                      style={{
                        backgroundColor:
                          CLIENT_TYPE_COLORS[client.type] ||
                          CLIENT_TYPE_COLORS.default,
                      }}
                    />
                    <span className="text-sm">{client.type}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        {isAdmin && (
          <Button
            variant="outline"
            className="w-full text-[#1a73e8] border-[#dadce0] hover:bg-[#f1f3f4] mb-4"
            onClick={() => refreshSheetData()}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCcw className="h-3.5 w-3.5 ml-2" />
            {isRefreshing
              ? "מרענן מהגיליון..."
              : isLoading
              ? "מרענן..."
              : "רענן נתוני לקוחות"}
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full text-[#1a73e8] border-[#dadce0] hover:bg-[#f1f3f4]"
          onClick={() => {
            window.open("https://calendly.com/support", "_blank");
          }}
        >
          לשליחת הודעה
        </Button>
      </div>
    </div>
  );
}
