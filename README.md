# 📡 FEELS_FM // EMOTION DASHBOARD

![Project Status](https://img.shields.io/badge/STATUS-OPERATIONAL-00ff41?style=for-the-badge&logo=terminator&logoColor=black)
![Design System](https://img.shields.io/badge/THEME-NEO--BRUTALISM-ff90e8?style=for-the-badge)

> **"A high-contrast, data-driven interface for tracking emotional states in the digital age."**

**Feels FM** is a web-based dashboard that combines **Neo-Brutalist aesthetics** with real-time browser technologies. It functions as a personal "Mission Control" for logging moods, monitoring system status, and generating visual data reports.

---

## SYSTEM PREVIEW

| **Light Mode (Day Operations)** | **Dark Mode (Night Operations)** |
|:---:|:---:|
| *(Add your Light Mode Screenshot here)* | *(Add your Dark Mode Screenshot here)* |

---

## CORE MODULES

### **The Dashboard (VIP Lounge)**
* **Live Mood Tracking:** Visualizes emotional data using Chart.js.
* **Surveillance Module:** Mock webcam interface with "Face Detection" overlays.
* **System Terminal:** Scrolling log of system activities and encryption protocols.
* **Global Clock:** Real-time synchronized digital clock (Local Time).
* **Street Art Window:** Curated graffiti display with CSS-filtered rendering.

### **Visual & Audio Engine**
* **Neo-Brutalist UI:** Raw CSS, heavy black borders, stark shadows, and monospaced typography.
* **Responsive Theme Engine:** CSS Variables (`var(--bg-color)`, `var(--text)`) handle seamless switching between Day (White/Black) and Night (Black/White/Green) modes.
* **Procedural Sound Engine:** Custom `AudioContext` API generates real-time synthesizer "beeps" and mechanical "clicks" on interaction—no MP3 files required.

### **Reporting System**
* **Mission Report Generation:** Integrated `window.print()` functionality with custom `@media print` styling to export clean, black-and-white PDF logs of current sessions.

---

## TECH STACK

* **HTML5:** Semantic structure.
* **CSS3:** Custom properties, Flexbox/Grid layouts, CSS Animations (CRT flicker, Marquee).
* **JavaScript (ES6+):**
    * `Chart.js` for data visualization.
    * `AudioContext API` for procedural sound generation.
    * `LocalStorage` for theme persistence.
* **Fonts:** Courier New (System Monospace).

---

## INSTALLATION & SETUP

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/mrsiuuuu-x1/feels-fm.git](https://github.com/mrsiuuuu-x1/feels-fm.git)
    ```

2.  **Navigate to Directory:**
    ```bash
    cd feels-fm
    ```

3.  **Launch the System:**
    * Simply open `index.html` in your browser.
    * *Optional:* Use `Live Server` (VS Code Extension) for the best experience.

---

## FILE STRUCTURE

```text
/FEELS-FM
│
├── index.html          # Landing Page (System Entry)
├── login.html          # Authentication Gateway
├── dashboard.html      # Main Control Room
│
├── style.css           # The Master Stylesheet (Neo-Brutalist Logic)
├── script.js           # Dashboard Logic (Charts, Time, Print)
├── sounds.js           # Audio Engine (Shared across pages)
│
├── assets/             # Images & Icons
│   ├── graffiti.jpg
│   └── basquiat_render.jpg
│
└── README.md           # System Documentation
```

## CONTROLS

* **[ X ] Buttons:** Triggers hover sound effects (Simulation only).
* **Theme Toggle:** Switches between "Paper Mode" (Light) and "Terminal Mode" (Dark).
* **Print Button:** Generates a PDF report of the current dashboard state.
* **Start Camera:** Activates the webcam UI overlay.

---

## CONTRIBUTING

Systems are always evolving. If you want to patch a bug or add a new module:

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## LICENSE

Distributed under the MIT License. See `LICENSE` for more information.

---