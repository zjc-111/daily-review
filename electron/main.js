// Electron main process — Daily Review
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

const isDev = process.env.NODE_ENV === "development" || process.argv.includes("--dev");
const DEV_URL = "http://localhost:5173";

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 640,
    title: "Daily Review",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#f0f2f8",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const distPath = path.join(process.resourcesPath, "client");
    if (!fs.existsSync(distPath)) {
      console.error("[electron] Client files not found at:", distPath);
      app.quit();
      return;
    }
    mainWindow.loadFile(path.join(distPath, "index.html"));
  }

  mainWindow.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) console.log(`[renderer] ${message}`);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
