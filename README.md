<div align="center">

# osu! Performance Helper

**Next-Generation Session Tracker, Replay Analyzer, Bottleneck Diagnostics, and P2P Collaboration Engine for osu!**

[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com)
[![Rust](https://img.shields.io/badge/Backend-Rust_1.80+-DEA584?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Tauri](https://img.shields.io/badge/Framework-Tauri_v2-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join_Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/ZwuzTkEbKU)

<br />

<p align="center">
  A high-performance desktop application engineered with Rust and React that continuously tracks your osu! sessions in real time, parses replays down to individual millisecond tap distributions, identifies technical bottlenecks, and synchronizes live plays with friends across a zero-configuration P2P mesh network.
</p>

</div>

---

## Key Features

### 1. Real-Time Session Monitoring
* **Zero-Interruption Tracking:** Detects active osu! stable and osu! lazer installations automatically. Captures every submitted score and fail in real time without requiring manual input or browser extensions.
* **Instant PP Breakdown:** Computes genuine Performance Points (PP), Aim PP, Speed PP, Accuracy PP, and Choke PP (estimated PP if the player had achieved Full Combo).
* **Detailed Play Telemetry:** Inspect hit distributions (300, 100, 50, Miss), Unstable Rate (UR), max combo, accuracy curve, and difficulty rating adjustments for all active mods (NM, HD, HR, DT, FL, EZ, HT).

### 2. Micro-Timing & .osr Replay Parser
* **Frame-by-Frame Tap Deconstruction:** Drag and drop any `.osr` replay file to analyze cursor telemetry, tap balance, key press distribution (K1 vs K2), and millisecond-level tap bias.
* **Hit Window Buckets:** Visualizes early vs. late timing errors, identifying whether inaccuracy stems from finger fatigue, rhythm misreading, or hardware latency.
* **Stamina Decay Detection:** Tracks unstable rate progression across four quadrants of the beatmap to determine endurance drop-offs on long streams.

### 3. Bottleneck & Skill Barrier Diagnostics
* **Automated Wall Detection:** Algorithms analyze aggregate play history to calculate your current **Speed Wall** (BPM threshold where finger control degrades), **Reading Wall** (Approach Rate boundaries), and **Precision Wall** (Circle Size limits).
* **Actionable Training Recommendations:** Generates structured advice and mechanical drills tailored specifically to your detected weakness.

### 4. Daily Workout Generator (.osdb / collection.db)
* **Custom Practice Sets:** Synthesizes a daily 10-map regimen calibrated to your exact skill level across three phases: *Warmup & Aim Calibration*, *Speed Barrier & Finger Control*, and *Stamina & Long Streams*.
* **Direct Game Launch:** One-click integration with `osu://` Direct protocol and mirror downloads (`.osz`).
* **Desktop Collection Export:** One-click export to Collection Manager (`.osdb`) and direct binary format (`collection.db`) with automatic UTF-8 byte packing and MD5 matching.

### 5. Decentralized P2P Mesh Network
* **Real-Time Peer Discovery:** Connects players automatically over an MQTT WebSocket mesh protocol without dedicated match servers.
* **Live Session Streaming:** View friends' current active session plays, map difficulty, accuracy, and performance in real time.
* **Dynamic Profile Resolver:** Resolves any player's official osu! avatar and user ID on the fly. Allows on-the-fly profile switching directly within the interface.

---

## User Interface

The application features a dark-themed **Neumorphic design system**:
* High-contrast telemetry dials for real-time aim precision, finger balance, and stamina decay.
* Interactive performance graphs tracking score-by-score accuracy and UR trends.
* Seamless collapsible session drawers, attempt grouping for retried beatmaps, and mod-specific filtering.

---

## Architecture & Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, CSS Neumorphism | High-DPI responsive UI, real-time telemetry rendering, zero third-party UI dependencies |
| **Desktop Runtime** | Tauri v2, Webview2 | Native OS shell with a minimal memory footprint (<40 MB RAM) |
| **Backend Core** | Rust 1.80+, Tokio, Reqwest, Serde | Raw replay binary parser, PP algorithms, multi-threaded file system watcher |
| **P2P Networking** | MQTT over WebSockets, Binary Frame Handshake | Cross-client presence broadcasting, live session score streaming, latency pinging |

---

## Installation & Running

### Download Precompiled Binary
Precompiled stand-alone executables for 64-bit Windows are available in the **Releases** section. No installer or runtime prerequisites are required.

### Building from Source

#### Prerequisites
1. **Node.js:** v18.0 or higher ([Download](https://nodejs.org/))
2. **Rust & Cargo:** Latest stable toolchain ([Install via rustup](https://rustup.rs/))
3. **C++ Build Tools:** Visual Studio C++ Build Tools (included in Visual Studio Installer)

#### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/osu-performance-helper.git
   cd osu-performance-helper
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run tauri dev
   ```

4. **Compile optimized production release:**
   ```bash
   npm run tauri build
   ```
   The resulting standalone `.exe` will be located in `src-tauri/target/release/`.

---

## File Structure

```
osu-performance-helper/
├── src/
│   ├── App.tsx             # Primary application dashboard & state manager
│   ├── index.css           # Custom neumorphic design tokens and styling
│   ├── main.tsx            # React application entrypoint
│   └── p2p_mesh.ts         # High-reliability MQTT WebSocket P2P networking client
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs          # Tauri command dispatcher and IPC bridge
│   │   ├── main.rs         # Native desktop entrypoint
│   │   ├── osu_math.rs     # Performance Points (PP) calculation engine
│   │   ├── replay_parser.rs# .osr replay binary decoder & frame telemetry analyzer
│   │   ├── bottleneck.rs   # Player skill wall & weakness diagnostics
│   │   ├── collection.rs   # .osdb & collection.db binary generator
│   │   ├── session.rs      # Session database, history persistence, and preferences
│   │   ├── live_tracker.rs # Background score polling and osu! API bridge
│   │   └── p2p_mesh.rs     # Rust-side UDP discovery and network utilities
│   ├── Cargo.toml          # Rust package configuration & dependency tree
│   └── tauri.conf.json     # Tauri runtime security and window configuration
├── package.json            # Node.js project manifest
├── tsconfig.json           # TypeScript compiler configuration
└── vite.config.ts          # Vite bundler build settings
```

---

## Safety & Compliance

* **Read-Only Operation:** The tool inspects local logs, public web endpoints, and standard `.osr` replay files. It does not inject into the osu! process memory or modify game code while playing.
* **Pure Mathematical Modeling:** Accuracy, difficulty, and PP algorithms are calculated strictly according to standardized performance equations.

---

## Community

Join the **[Discord Server](https://discord.gg/ZwuzTkEbKU)** for support, feature requests, bug reports, and to connect with other players using the tool.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
