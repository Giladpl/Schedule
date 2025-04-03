# Debugging Guide for Schedule App Server

This guide will help you debug the Node.js/Express server using various methods.

## VSCode Debugging

Three debugging configurations have been set up in `.vscode/launch.json`:

1. **Attach to Server**: Connect to an already running server with `--inspect` flag.
2. **Launch Server**: Start the server in debug mode, allowing you to set breakpoints.
3. **Launch with Break**: Start the server and pause execution immediately.

### Using VSCode Debugging

1. Set breakpoints in your server code by clicking in the gutter next to line numbers.
2. Open the Debug panel in VSCode (Ctrl+Shift+D or Cmd+Shift+D).
3. Select one of the configurations from the dropdown.
4. Click the green play button to start debugging.
5. **Important**: You need to start the client separately with `npm run dev:client` to access the UI.

## NPM Debug Scripts

Several npm scripts are available for debugging:

```bash
# Debug server and client simultaneously (will pause execution on first line)
npm run debug

# Debug server only with ts-node (client not started)
npm run debug:server

# Debug server with Chrome DevTools (client not started)
npm run debug:chrome

# Debug server with Chrome DevTools AND start the client (recommended)
npm run debug:full

# Start only the client (if server is already running)
npm run dev:client
```

## Debugging with Chrome DevTools

1. Run `npm run debug:full` to start both the server (in debug mode) and the client.
2. Open Chrome and navigate to `chrome://inspect`.
3. Click on "Open dedicated DevTools for Node".
4. Your Node.js server should appear under "Remote Target".
5. Click "inspect" to open the debugger.
6. Set breakpoints in the Sources tab or use `debugger` statements in your code.
7. Open another tab and navigate to http://localhost:5173 to access the UI.

## Common Issues

### "Site Cannot Be Reached" Error

If you see "Site cannot be reached" when trying to access the UI:

1. Make sure you're running both the server AND the client:

   - Use `npm run debug:full` to run both
   - Or run the client separately with `npm run dev:client`

2. Verify that the client is running by checking for this message in the terminal:

   ```
   VITE v5.x.x ready in xxx ms
   ➜ Local: http://localhost:5173/
   ```

3. Access the UI at http://localhost:5173 (not port 3000, which is the server port).

## Verifying Debugger Connection

The server includes a built-in debugger test:

1. When running in debug mode, you'll see "🔵 Debugger detected, debug mode is active" in the console.
2. Set a breakpoint in `server/debug-test.ts` or in the `debugTest()` function call in `server/index.ts`.
3. When the breakpoint hits, you can inspect variables, step through code, etc.

## Debugging the API Routes

To debug specific API endpoints:

1. Set breakpoints in `server/routes.ts` where the issue might be occurring.
2. There's already a `debugger` statement in the `/api/timeslots` endpoint.
3. Run any debug script and access the endpoint to trigger the breakpoint.

## Troubleshooting

- **Breakpoints not hitting**: Make sure your compiled code matches your source code. TypeScript source maps should be enabled by default.
- **Cannot connect to debugger**: Check if another process is using port 9229. You can change the port in the scripts if needed.
- **Chrome doesn't show Node target**: Make sure you're running the server with `--inspect` flag and check your firewall settings.
