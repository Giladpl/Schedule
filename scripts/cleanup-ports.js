import { execSync } from "child_process";

const portsToCheck = [3000, 5000, 5173]; // Server, alternative server port, and Vite dev server

function killProcessOnPort(port) {
  try {
    console.log(`Checking port ${port}...`);

    // Get process ID using lsof
    try {
      const pid = execSync(`lsof -t -i:${port}`).toString().trim();
      if (pid) {
        console.log(`Found process ${pid} on port ${port}`);
        try {
          execSync(`kill -9 ${pid}`);
          console.log(`Killed process ${pid} on port ${port}`);
        } catch (killError) {
          console.log(`Process ${pid} was already terminated`);
        }
      } else {
        console.log(`No process found on port ${port}`);
      }
    } catch (lsofError) {
      // If lsof fails, it means no process is using the port
      console.log(`No process found on port ${port}`);
    }
  } catch (error) {
    console.error(
      `Error checking/killing process on port ${port}:`,
      error.message
    );
  }
}

console.log("Starting port cleanup...");

// Kill processes on all ports
portsToCheck.forEach(killProcessOnPort);

console.log("Port cleanup complete.");

// Exit successfully even if some ports couldn't be killed
// This allows npm start to proceed
process.exit(0);
