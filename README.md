# Better-Music 🎵

An elegant, desktop-class music player application built with **Electron**, focusing heavily on responsive UI design, modern typography, and robust future-proof media handling. 

Better-Music is crafted to bridge the gap between stunning visual aesthetics and local-first high-performance audio playback.

## Features

- **Design-First UI:** Crafted with highly modular, responsive styling to ensure pixel-perfect presentation.
- **Cross-Platform Foundation:** Built on top of Electron for smooth, desktop-native execution.
- **Responsive Adaptive Layouts:** Tailored stylesheets for both wide desktop windows and compact/mobile views.
- **Secure IPC Pipeline:** Employs Electron best practices, utilizing an isolated context bridge for inter-process communication.
- **Sass (SCSS) Integration:** Leverages compiled stylesheets with mapped source tracking for rapid, modular design prototyping.
- **Full Privacy:** Everything is stored on the users device, even the listening activity and the Bootstrap framework files.

## Project Architecture

The application is structured around Electron's multi-process architecture to isolate user interface rendering from deep system operations:

```
├── index.html          # Core HTML UI layout structure
├── main.js             # Electron Main Process (Lifecycle & Native API)
├── preload.js          # Secure Context Bridge IPC interface
├── script.js           # Electron Renderer Process (UI logic & control state)
├── style.css           # Global core layout styles
├── style-desktop.css   # Styling optimizations for desktop environments
├── style-phone.css     # Responsive/compact layouts for small viewport tracking
├── ceva.scss           # Scss design modules
├── ceva.css            # Compiled CSS build
└── ceva.css.map        # Source mapping for design debugging

```
To install a older version of the app and the next versions that are on their way you can downnload it from the Microsoft Store: 
https://apps.microsoft.com/store/detail/9PPB5WWX1BJ4?cid=DevShareMCLPCS

## Future Roadmap 
In future revisions and hopefully in the next update which I'm planning to be the 1.0 version the app will allow users to:
- Search as they type;
- Edit playlist and album details;
- See details about their listening activity;
- Add a song to a queue;
- Implement the TP (Temporary Playlist);

In the more distant future the app will be ported to Android using Capacitor.



