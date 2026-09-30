# WasmBox Core

A Secure Multi-Tenant WebAssembly Plugin Sandbox for untrusted Python execution with strict memory, file system, and network isolation.

Created by **Prasanna** (`e8ec084@sairamtap.edu.in`).

---

## 🚀 How to Run in Visual Studio Code (VS Code)

### 1. Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (version 18 or higher; version 20+ recommended)
- [Visual Studio Code](https://code.visualstudio.com/)

---

### 2. Open in VS Code
1. Open Visual Studio Code.
2. Go to **File** > **Open Folder...** (or press `Ctrl+K Ctrl+O` on Windows/Linux, `Cmd+O` on macOS).
3. Select this project root folder.

---

### 3. Install Dependencies
Open the VS Code integrated terminal (`Ctrl+\`` or `Terminal` > `New Terminal`) and run:

```bash
npm install
```

*(You can also use `bun install` or `pnpm install` if preferred).*

---

### 4. Run the Application

#### Option A: Quick Command Line (Terminal)
In the VS Code integrated terminal, run:

```bash
npm run dev
```

The app will start at:
👉 **[http://localhost:3000](http://localhost:3000)**

Click the link or open your web browser to view the application.

#### Option B: VS Code 1-Click Run & Debug (F5)
1. Press `F5` or switch to the **Run & Debug** view in the VS Code sidebar (`Ctrl+Shift+D` / `Cmd+Shift+D`).
2. Select **Run Vite Dev Server** or **Launch Chrome on localhost:3000** from the dropdown.
3. Click the green Play button or hit `F5`.

#### Option C: VS Code Task Runner
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the Command Palette.
2. Type `Tasks: Run Task` and hit Enter.
3. Select `npm: dev`.

---

## 🖥️ How to Run in Visual Studio (2022 / 2019 Full IDE)

If you are using **Microsoft Visual Studio 2022** (or 2019):

### 1. Prerequisites
- **Visual Studio 2022** (Community, Professional, or Enterprise).
- Ensure the **"Node.js development"** or **"ASP.NET and web development"** workload is installed (via Visual Studio Installer).
- **Node.js** (v18 or v20+).

### 2. Open the Folder in Visual Studio
1. Launch **Visual Studio 2022**.
2. On the Start Window, click **"Open a local folder"** (or in the top menu: **File** > **Open** > **Folder...**).
3. Select this project root folder.
4. Visual Studio will load the files in **Solution Explorer - Folder View**.

### 3. Install Dependencies
- Open the built-in Developer Terminal in Visual Studio:
  - Top menu: **View** > **Terminal** (shortcut: ``Ctrl + ` ``).
  - Run:
    ```powershell
    npm install
    ```

### 4. Run the Dev Server in Visual Studio
- **Option 1 (Developer Terminal)**:
  Run `npm run dev` in the terminal and open `http://localhost:3000` in your browser.
- **Option 2 (Debug Toolbar / F5)**:
  In the top toolbar, click the green Play button marked **`npm run dev (Vite Dev Server)`** (configured automatically via `launch.vs.json`).
- **Option 3 (Task Runner Explorer)**:
  Go to **View** > **Other Windows** > **Task Runner Explorer**, expand `package.json` > `Scripts`, and double-click `dev`.

---

## 🛠 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on `http://localhost:3000` with instant Hot Module Replacement (HMR) |
| `npm run build` | Compiles the TypeScript application into static production assets in the `dist/` folder |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs TypeScript compiler checks without emitting files (`tsc --noEmit`) |

---

## 🧩 Project Structure

```
├── .vscode/
│   ├── launch.json      # VS Code 1-click Run & Debug configuration
│   ├── tasks.json       # VS Code automated task runners
│   ├── settings.json    # TypeScript & editor workspace settings
│   └── extensions.json  # Recommended VS Code extensions
├── src/
│   ├── components/      # React components (Dashboard, Sandbox IDE, Header, etc.)
│   ├── types.ts         # TypeScript data contracts & models
│   ├── data.ts          # Default mock modules, audit logs & execution presets
│   ├── App.tsx          # Main application orchestration & authentication
│   └── main.tsx         # React root mounting entry point
├── index.html           # Single-page entry with metadata & author attribution
├── vite.config.ts       # Vite & Tailwind CSS setup
└── package.json         # Scripts and dependencies
```

## Enterprise Presentation Edition

This repository is presented as a **control-plane prototype** for a secure multi-tenant WebAssembly execution platform.

### Enterprise UI improvements
- Dark enterprise navigation shell with Workspace / Operations / Administration information architecture.
- Executive dashboard with runtime health, active execution, module registry, memory posture, and success-rate telemetry.
- Security posture panel for filesystem, network, memory, fuel, and allowlisted host-bridge controls.
- Verification suite for controlled isolation scenarios.
- Recent execution table and audit-oriented activity presentation.
- Explicit demo/prototype labeling so simulated telemetry is not confused with production infrastructure.
- Responsive behavior for desktop and smaller screens.

### Presentation narrative
1. **Problem** — untrusted customer plugins should not execute directly on application servers.
2. **Isolation model** — WebAssembly/WASI execution with default-deny capabilities.
3. **Resource governance** — memory and instruction/fuel ceilings.
4. **Controlled host integration** — explicit allowlisted host functions instead of unrestricted access.
5. **Developer experience** — browser-based sandbox IDE, module registry, webhooks, execution history, and audit logs.
6. **Operational visibility** — runtime status, execution telemetry, and verification scenarios.

> **Important:** The current frontend is a presentation/demo control plane. Runtime values and execution telemetry are simulated by the React application unless connected to a real backend runtime.
