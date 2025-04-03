# ScheduleSync - Smart Client-Based Scheduling Calendar

A dynamic scheduling application that integrates with Google Calendar and Sheets for appointment booking and client management, with specialized support for client type filtering and time zone handling.

## Features

- **Google Integration**: Seamless integration with Google Calendar and Google Sheets
- **Client-Based Scheduling**: Filter available slots based on client type (via URL parameters, e.g., `?type=new`)
- **Dynamic Meeting Types**: Automatically imports meeting types and durations from Google Sheets
- **Israel Time Zone**: Specifically configured for Asia/Jerusalem with automatic DST handling
- **Multi-view Calendar**: Weekly and monthly calendar views with responsive design
- **Slot Splitting**: Intelligent slot management that splits timeslots when bookings occur
- **URL Parameter Filtering**: Support for client filtering via URL parameters (`?type=vip`, `?type=new`, etc.)
- **Automatic Localization**: Support for both Hebrew and English interfaces

## Prerequisites

- Node.js 18+ installed
- Google Cloud Platform account with:
  - Google Sheets API enabled
  - Google Calendar API enabled
  - Service account with appropriate permissions
- Git for version control

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Giladpl/ScheduleSync.git
cd ScheduleSync
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```
# Google API credentials
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_SHEET_ID=your_sheet_id

# Server configuration
PORT=5000
NODE_ENV=development

# Optional: Set a specific sheet name (default is "Platforms")
# SHEET_NAME=YourSheetName
```

### 4. Google Credentials Setup

Create a `google-credentials.json` file in the root directory with your service account details:

```json
{
  "type": "service_account",
  "project_id": "your_project_id",
  "private_key_id": "your_private_key_id",
  "private_key": "your_private_key",
  "client_email": "your_client_email",
  "client_id": "your_client_id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your_client_cert_url",
  "universe_domain": "googleapis.com"
}
```

**Important note about private keys**: When copying your private key from Google Cloud, make sure all newlines are properly escaped with `\n`. This is a common source of authentication errors.

### 5. Google Sheets Structure

Your Google Sheet should have the following structure:
- Column A: Row ID (numeric)
- Column B: Client Type (string)
- Additional columns: Meeting types with their durations in minutes (numeric)

Example structure:
```
| Row ID | Client Type | טלפון | זום | פגישה |
|--------|-------------|-------|-----|-------|
| 0      | פולי אחים   | 15    |     | 60    |
| 1      | מדריכים+    | 15    | 90  |       |
| 5      | new_customer| 30    | 45  | 60    |
```

### 6. Start the application

```bash
npm run dev
```

The application will be available at http://localhost:5000

## Testing and Debugging

### Testing Google Sheets Integration

The application includes a debugging endpoint to verify your Google Sheets integration:

```
GET http://localhost:5000/api/debug/sheet-data
```

This endpoint returns:
- Raw data from your Google Sheet
- Interpreted client rules
- Header mapping information
- Currently stored rules in the application

Use this endpoint to troubleshoot any issues with your Google Sheets setup.

### Client Type URL Parameters

The application supports filtering available slots by client type:

- For all clients: `http://localhost:5000/calendar`
- For VIP clients: `http://localhost:5000/calendar?type=vip`
- For new clients: `http://localhost:5000/calendar?type=new`
- For specific client types: `http://localhost:5000/calendar?type=new_customer`

## Development Workflow

### Working between Local Environment and Replit

#### Local Development (Cursor/VS Code)

1. Clone the repository:
   ```bash
   git clone https://github.com/Giladpl/ScheduleSync.git
   cd ScheduleSync
   ```

2. Install dependencies and start the server:
   ```bash
   npm install
   npm run dev
   ```

3. After making changes, commit and push:
   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   git push origin main
   ```

#### Replit Development

1. Make sure your Replit project is connected to the GitHub repository
2. Pull latest changes:
   ```bash
   git pull origin main
   ```
3. The Replit workflow "Start application" will automatically run the project

### Environment Differences

- **Replit**: Uses environment secrets for credentials (configured in Replit settings)
- **Local**: Uses `.env` file and `google-credentials.json` for credentials

### Using the Export Script

To prepare the project for GitHub:

```bash
./prepare-export.sh
```

This script:
- Copies all necessary files to an `exported` directory
- Creates convenience scripts for running in different environments
- Sets up VS Code settings for easier development
- Provides instructions for GitHub repository setup

## Project Structure

```
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── calendar/    # Calendar-specific components
│   │   │   └── ui/          # General UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions and services
│   │   │   ├── calendarService.ts  # Calendar data service
│   │   │   ├── queryClient.ts      # React Query setup
│   │   │   └── timeUtils.ts        # Date & time utilities
│   │   ├── pages/           # Page components
│   │   └── App.tsx          # Main application component
│   └── index.html           # HTML template
├── server/                  # Backend Express server
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Data storage implementation
│   └── vite.ts              # Vite server configuration
├── shared/                  # Shared code between client and server
│   └── schema.ts            # Data models and schemas
├── scripts/                 # Helper scripts
│   ├── start-dev.sh         # Start development server
│   └── start-prod.sh        # Start production server
└── README.md                # Project documentation
```

## License

This project is licensed under the MIT License.

## Need More Help?

For detailed local development instructions, see [local-setup.md](./local-setup.md) which provides:
- Step-by-step environment setup
- Troubleshooting guides
- VS Code / Cursor configuration tips
- Google APIs setup guidance