import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CLIENT_TYPE_COLORS,
  MEETING_TYPE_STYLES,
  stringToColor,
} from "@/components/ui/time-slot";
import { useToast } from "@/hooks/use-toast";
import {
  fetchClientData,
  getClientTypeDisplayName,
  refreshClientRules,
  type ClientRule,
} from "@/lib/calendarService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, RefreshCcw, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";

interface SidebarProps {
  clientType: string;
  onClientTypeChange: (type: string) => void;
  meetingType: string;
  onMeetingTypeChange: (value: string) => void;
  isAdmin?: boolean;
}

export default function Sidebar({
  clientType,
  onClientTypeChange,
  meetingType,
  onMeetingTypeChange,
  isAdmin = false,
}: SidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<ClientRule[]>([]);

  // Fetch client data (this contains both client types and their available meeting types)
  const { data: clientData, isLoading: isLoadingClientData } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
  });

  // Mutation for refreshing client rules from Google Sheets
  const { mutate: refreshRules, isPending: isRefreshing } = useMutation({
    mutationFn: refreshClientRules,
    onSuccess: (data) => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/client-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/client-meeting-types"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-data"] });

      toast({
        title: "Client Rules Refreshed",
        description: `Successfully updated ${data.rules.length} client rules from Google Sheets.`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error refreshing client rules:", error);
      toast({
        title: "Error",
        description: "Failed to refresh client rules from Google Sheets.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (clientData) {
      setClients(clientData.clients);
    }
  }, [clientData]);

  const handleRefresh = async () => {
    refreshRules();
  };

  const handleTypeChange = (type: string) => {
    if (type === clientType) {
      return type;
    }
    onClientTypeChange(type);
    return type;
  };

  // Get available meeting types for the selected client type
  const getAvailableMeetingTypes = (): string[] => {
    // If data isn't available yet or loading, show a loading state
    if (!clientData?.clients || clientData.clients.length === 0) {
      return [];
    }

    // If "all" is selected AND we're an admin, return all meeting types from all clients
    if (clientType === "all" && isAdmin) {
      const allTypesSet = new Set<string>();
      clientData.clients.forEach((client) => {
        Object.keys(client.meetings || {}).forEach((type) => {
          if (type.trim()) {
            allTypesSet.add(type);
          }
        });
      });

      return Array.from(allTypesSet);
    }

    // Try to find the selected client with multiple matching strategies
    let selectedClient = null;

    // First try exact match by type name (most reliable)
    selectedClient = clientData.clients.find(
      (client) => client.type === clientType
    );

    // Then try by numeric ID if no match and clientType is a number
    if (!selectedClient && !isNaN(parseInt(clientType))) {
      const numericId = parseInt(clientType);
      selectedClient = clientData.clients.find(
        (client) => client.id === numericId
      );
    }

    // Legacy fallback: first letter matching (for backward compatibility)
    if (!selectedClient && clientType.length === 1) {
      selectedClient = clientData.clients.find((client) =>
        client.type.startsWith(clientType)
      );
    }

    // If we found a matching client, get its meeting types
    if (selectedClient?.meetings) {
      return Object.keys(selectedClient.meetings).filter((t) => t.trim());
    }

    // If no match found, return empty array to indicate no allowed meeting types
    return [];
  };

  const availableMeetingTypes = getAvailableMeetingTypes();

  // Always include "All Types" at the beginning of the list
  const displayMeetingTypes = ["all", ...availableMeetingTypes];

  // When client type changes, we need to reset the meeting type selection
  // if the current selection isn't available for the new client type
  useEffect(() => {
    if (!clientData) return;

    const availableMeetingTypes = getAvailableMeetingTypes();
    if (meetingType !== "all" && !availableMeetingTypes.includes(meetingType)) {
      // Reset to "all" if current meeting type isn't available for this client
      onMeetingTypeChange("all");
    }
  }, [clientType, meetingType, onMeetingTypeChange, clientData]);

  // Get display names for meeting types
  const getMeetingTypeDisplayName = (type: string): string => {
    // Use the exact display name from the data
    return type;
  };

  const clientTypeLabel = getClientTypeDisplayName(clientType);

  return (
    <div className="hidden md:block w-64 border-r border-[#dadce0] p-4 py-8">
      {/* Only show client type filter for admins */}
      {isAdmin && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[#5f6368] mb-4">
            CLIENT TYPE
          </h2>
          {isLoadingClientData ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <RadioGroup
              value={clientType}
              onValueChange={handleTypeChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="all"
                  id="all"
                  className="text-[#1a73e8]"
                />
                <Label htmlFor="all">{getClientTypeDisplayName("all")}</Label>
              </div>
              {clients.map((client) => (
                <div key={client.type} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={client.type}
                    id={client.type}
                    className="text-[#1a73e8]"
                  />
                  <Label htmlFor={client.type}>
                    {getClientTypeDisplayName(client.type)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-medium text-[#5f6368] mb-4">
          MEETING TYPE
        </h2>
        {isLoadingClientData ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-semibold">Meeting Type</h3>
            </div>

            <div className="p-3">
              <div className="space-y-2">
                {/* Only render the meeting type options if we have data */}
                {displayMeetingTypes.length > 0 ? (
                  displayMeetingTypes.map((type) => (
                    <div
                      key={type}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                        meetingType === type
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => onMeetingTypeChange(type)}
                    >
                      <div
                        className={`w-4 h-4 rounded-full ${
                          meetingType === type
                            ? "ring-2 ring-blue-500 bg-blue-500"
                            : "border border-gray-300"
                        }`}
                      >
                        {meetingType === type && (
                          <div className="w-2 h-2 bg-white rounded-full m-1"></div>
                        )}
                      </div>
                      <span className="text-sm">
                        {type === "all" ? "All Types" : type}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2">
                    Loading meeting types...
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Types Legend */}
            <div className="p-3 border-t border-gray-200">
              <h3 className="font-semibold mb-2 text-sm">Legend:</h3>
              <div className="space-y-2">
                {availableMeetingTypes.length > 0 ? (
                  availableMeetingTypes.map((type) => {
                    const style =
                      MEETING_TYPE_STYLES[type] || MEETING_TYPE_STYLES.default;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: style.color }}
                        ></div>
                        <span className="text-xs">{type}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500">
                    No meeting types available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-[#5f6368] mb-4">LEGEND</h2>
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[#5f6368]">Meeting Types:</h3>
          <div className="flex items-center mb-2">
            <div
              className="w-5 h-5 rounded-sm mr-3 flex items-center justify-center text-white"
              style={{ backgroundColor: "#34a853" }}
            >
              <Phone size={14} />
            </div>
            <span className="text-sm">טלפון (Phone)</span>
          </div>
          <div className="flex items-center mb-2">
            <div
              className="w-5 h-5 rounded-sm mr-3 flex items-center justify-center text-white"
              style={{ backgroundColor: "#4285f4" }}
            >
              <Video size={14} />
            </div>
            <span className="text-sm">זום (Zoom)</span>
          </div>
          <div className="flex items-center mb-2">
            <div
              className="w-5 h-5 rounded-sm mr-3 flex items-center justify-center text-white"
              style={{ backgroundColor: "#ea4335" }}
            >
              <Users size={14} />
            </div>
            <span className="text-sm">פגישה (In-person)</span>
          </div>

          {/* Only show client type legend for admins */}
          {isAdmin && (
            <>
              <h3 className="text-xs font-medium text-[#5f6368] mt-3">
                Client Types:
              </h3>
              {clientData?.clients && (
                <>
                  {/* Always show "All Clients" option */}
                  <div className="flex items-center">
                    <div
                      className="w-5 h-5 rounded-md mr-3 flex items-center justify-center"
                      style={{ backgroundColor: "#6366f1" }}
                    ></div>
                    <span className="text-sm">
                      {getClientTypeDisplayName("all")}
                    </span>
                  </div>

                  {/* Show first 3 client types from the loaded data */}
                  {clientData.clients.slice(0, 5).map((client, idx) => {
                    // Generate color dynamically using the same function as TimeSlot
                    const color =
                      CLIENT_TYPE_COLORS[client.type] ||
                      stringToColor(client.type);
                    return (
                      <div key={idx} className="flex items-center mt-1">
                        <div
                          className="w-5 h-5 rounded-md mr-3"
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="text-sm">
                          {getClientTypeDisplayName(client.type)}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Only show admin controls for admins */}
      {isAdmin && (
        <div>
          <h2 className="text-sm font-medium text-[#5f6368] mb-4">
            ADMIN CONTROLS
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1a73e8]"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {isRefreshing ? "Refreshing..." : "Refresh Client Rules"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Updates client rules from Google Sheets
          </p>
        </div>
      )}
    </div>
  );
}
