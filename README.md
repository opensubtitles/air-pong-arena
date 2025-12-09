# 🏓 Air Pong Arena

**Air Pong Arena** is a futuristic, gesture-controlled pong game playable directly in your browser. Using AI-powered hand tracking, you control the paddle with your real hand movements—no controller required.

![Air Pong Arena Demo](public/vite.svg) *<!-- Replace with actual screenshot ideally -->*

## 🌟 Features
-   **Hand Tracking Control**: Move your paddle by moving your index finger.
-   **Gesture Recognition**:
    -   **Open Hand ✋**: Boost / Calibration.
    -   **Closed Fist ✊**: grab / Control.
-   **Neon Aesthetics**: Cyberpunk-inspired visuals with bloom effects and dynamic lighting.
-   **Multiplayer**: Create or join rooms to play against friends in real-time.
-   **3D Physics**: Built with Three.js and Cannon.js for satisfying ball interaction.

## 🎮 How to Play
1.  **Calibrate**: Follow the initial "Dojo Training" to sync your hand position.
2.  **Move**: Move your hand Left/Right to control the paddle.
3.  **Boost**: Show an **Open Palm** to trigger a speed boost (if available).
4.  **Win**: Score points by getting the ball past your opponent.

## 🛠️ Tech Stack
-   **Frontend**: React, TypeScript, Vite
-   **3D Engine**: React Three Fiber (Three.js)
-   **AI/CV**: MediaPipe (Google), TensorFlow.js
-   **State**: Zustand
-   **Networking**: Socket.io (Signaling), WebRTC (P2P Data)
-   **Styling**: TailwindCSS

## 🚀 Development

### Prerequisites
-   Node.js (v18+)
-   Webcam

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start local multiplayer server (optional for single player)
node server/index.js
```

## 📦 Deployment
This project is configured for **GitHub Pages**.
1.  Push to `main` branch.
2.  The GitHub Action automatically builds and deploys the frontend.
3.  (Optional) Set `VITE_SERVER_URL` in GitHub Secrets for your custom signaling server.

---
*Powered by [OpenSubtitles.org](https://www.opensubtitles.org)*
