# Google Sheet Structure Guide

This file explains how to set up your Google Sheet for use with ScheduleSync.

## Sheet Name
The default sheet name is "Platforms". You can customize this by setting the `SHEET_NAME` environment variable.

## Column Structure
Your sheet should have the following columns:

| Column A | Column B     | Column C+ (Meeting Types) |
|----------|--------------|---------------------------|
| Row ID    | Client Type  | Duration in minutes       |

## Header Row
The first row should contain headers:
- Column A: Leave blank or label as "ID"
- Column B: "Client Type" 
- Column C+: Names of meeting types (e.g., "טלפון", "זום", "פגישה")

## Data Rows
Each subsequent row represents a client type with allowed meeting durations:
- Column A: Numeric ID (0, 1, 2, etc.)
- Column B: Client type name (e.g., "new", "vip", "פולי אחים")
- Column C+: Duration in minutes for each meeting type (leave blank if not allowed)

## Example

| ID | Client Type | טלפון | זום | פגישה |
|----|-------------|-------|-----|-------|
| 0  | new         | 30    | 45  | 60    |
| 1  | vip         | 15    | 90  | 60    |
| 2  | quick       | 15    |     |       |

## Access Control
Make sure to share the sheet with your Google Service Account email (found in `google-credentials.json`).

## Testing
After setting up your sheet, you can test the integration using:
```bash
./scripts/test-api.sh
```
