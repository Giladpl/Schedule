// Define meeting type interface
export interface MeetingTypeDefinition {
  name: string;
  duration: number;
  displayName?: string;
}

// We don't hardcode meeting types anymore, they come from the server
// This type is used for API responses
export interface MeetingType {
  name: string;
  duration: number;
}
