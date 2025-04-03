# Local Development Setup Guide

This document provides detailed instructions for setting up the ScheduleSync project for local development with Visual Studio Code, Cursor, or any other code editor.

## Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)
- Git
- A code editor (VS Code, Cursor, etc.)

## Step 1: Clone the Repository

```bash
git clone https://github.com/Giladpl/ScheduleSync.git
cd ScheduleSync
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all the required packages defined in package.json, including:
- React and React DOM
- Express.js for the backend
- Google API libraries (googleapis, google-auth-library)
- TypeScript and related types
- UI libraries (Shadcn components, Tailwind CSS)
- Form handling libraries (react-hook-form, zod)
- Data fetching (TanStack React Query)
- Date handling (date-fns, date-fns-tz)

## Step 3: Set Up Environment Variables

1. Create a `.env` file in the root directory by copying from `.env.example`:

```bash
cp .env.example .env
```

2. Edit the `.env` file and add your Google API credentials:

```
# Google API credentials
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_PRIVATE_KEY=your_private_key

# Server configuration
PORT=5000
NODE_ENV=development

# Optional: Uncomment to define a specific Google Sheet name
# SHEET_NAME=YourSheetName
```

## Step 4: Set Up Google Credentials

1. Create a `google-credentials.json` file in the root directory by copying from `google-credentials.example.json`:

```bash
cp google-credentials.example.json google-credentials.json
```

2. Edit the `google-credentials.json` file with your Google Service Account credentials. You need to:
   - Create a Google Cloud project
   - Enable Google Sheets and Calendar APIs
   - Create a service account
   - Generate a JSON key for the service account

The file should look like:

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

## Step 5: Configure Google Sheets

1. Create a Google Sheet with the following structure:
   - Column A: Row ID
   - Column B: Client Type
   - Additional columns: Meeting types with their durations in minutes

Example header row:
```
| Row ID | Client Type | טלפון | זום | פגישה |
```

Sample data rows:
```
| 0 | פולי אחים | 15 |  | 60 |
| 1 | מדריכים+ | 15 | 90 |  |
| 5 | new_customer | 30 | 45 | 60 |
```

2. Share the sheet with the service account email from your credentials.

3. Add the sheet ID to your `.env` file.

## Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:5000

## VS Code / Cursor Integration

For a better development experience with VS Code or Cursor, we've included:

1. VS Code settings in `.vscode/settings.json` with:
   - Format on save
   - Recommended extensions
   - TypeScript path configuration
   - File excludes for cleaner navigation

2. VS Code tasks in `.vscode/tasks.json`:
   - "Start Development Server" task (default build task)
   - "Build for Production" task

3. Convenience scripts:
   - `start-dev.sh` - A one-click script to start the development server
   - `start-prod.sh` - A script to build and start the production server

## Understanding the Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── calendar/   # Calendar-specific components
│   │   │   └── ui/         # General UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and services
│   │   │   ├── calendarService.ts  # Calendar data service
│   │   │   ├── queryClient.ts      # React Query setup
│   │   │   └── timeUtils.ts        # Date & time utilities
│   │   ├── pages/          # Page components
│   │   └── App.tsx         # Main application component
│   └── index.html          # HTML template
├── server/                 # Backend Express server
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data storage (in-memory)
│   └── vite.ts             # Vite server configuration
└── shared/                 # Shared code between client and server
    └── schema.ts           # Data models and schemas
```

## Troubleshooting

### Google API Authentication Issues

If you encounter authentication issues with the Google APIs:

1. Verify your credentials:
   ```bash
   cat google-credentials.json
   ```
   Make sure your service account credentials are correctly formatted (check escaped quotes in private key).

2. Test API access:
   ```bash
   curl -X GET "http://localhost:5000/api/debug/sheet-data"
   ```
   This endpoint will show raw data from your Google Sheet and how it's being interpreted.

3. Check environment variables:
   ```bash
   cat .env
   ```
   Make sure GOOGLE_SHEET_ID is correct.

4. Check server logs for any errors:
   ```bash
   npm run dev
   ```
   Look for error messages related to Google API initialization.

### Port Conflicts

If port 5000 is already in use, edit the `server/index.ts` file to change the port number:

```typescript
// Line 62 in server/index.ts
const port = 5000; // Change to another port like 3000
```

### Sample Data Generation

The application will generate sample data if:
- Google Sheets integration is not configured
- No data is found for the requested time range

This makes it easy to test the application without setting up the Google APIs.

## Working Locally and with Replit

For optimal workflow between local development and Replit:

### Initial Setup

1. Create a GitHub repository and connect Replit to it:
   - In Replit, use the Git tab to push to your repository
   - In your local environment, clone this repository

### Daily Development Flow

1. When starting work on your local machine:
   ```bash
   git pull origin main        # Get latest changes from Replit/GitHub
   npm install                 # Install any new dependencies
   npm run dev                 # Start development server
   ```

2. When pushing your local changes:
   ```bash
   git add .                   # Stage all changed files
   git commit -m "Your changes description"
   git push origin main        # Push to GitHub
   ```

3. In Replit, to get your local changes:
   ```bash
   git pull origin main        # Pull from GitHub
   ```

### Environment Differences

- **Replit**: Uses environment secrets for API keys (already configured)
- **Local**: Uses `.env` file and `google-credentials.json` for API keys

This separation ensures you never accidentally commit sensitive credentials.