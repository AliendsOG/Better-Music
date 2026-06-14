# Better Music 🎵

An elegant, desktop-class music player application built with **Electron**, focusing heavily on responsive UI design, modern typography, and robust future-proof media handling. 
Better Music is crafted to bridge the gap between stunning visual aesthetics and local-first high-performance and high quality audio playback. 
The original idea was to have the app interface with some Spotify API so that if you listened to Linkin Park for 100 hours this year the app would ask Spotify something like "if a user listened to Linkin Park for 100hrs in what percentile of the fanbase is he?".
Basically I wanted to have a Spotify wrapped but everyday and to see my full listening activity throughout the years and how my music tastes develop and change.

---

## 🚀 Features

Better-Music comes packed with a robust set of features designed to give you total control over your audio experience:

- **Instant Search (Search-as-you-type)** – Find your favorite tracks, albums, and artists instantly with dynamic, real-time filtering as you type.
- **Temporary Playlists/Permanent Queue (PQ)** – Create on-the-fly, transient playlists for your current session without cluttering or permanently saving over your curated library.
- **Dynamic Queue Management** – Easily add any song to your active playback queue to control exactly what plays next.
- **Library Customization** – Keep your music organized by editing playlist names and album details directly within the app.
- **Listening Analytics** – Gain insights into your habits with detailed tracking about your listening activity.
- **Design-First UI:** Crafted with highly modular, responsive styling to ensure pixel-perfect presentation.
- **Cross-Platform Foundation:** Built on top of Electron for smooth, desktop-native execution.
- **Responsive Adaptive Layouts:** Tailored stylesheets for both wide desktop windows and compact/mobile views (mobile version is still in development) .
- **Secure IPC Pipeline:** Employs Electron best practices, utilizing an isolated context bridge for inter-process communication.
- **Sass (SCSS) Integration:** Leverages compiled stylesheets with mapped source tracking for rapid, modular design prototyping.
- **Full Privacy:** Everything is stored on the users device, even the listening activity and the Bootstrap framework files.

---

## 📦 Installation & Setup

Getting started with Better-Music is simple and straightforward. There is no need to clone deep dependencies, install fancy development environments, or run complex build tools. 

1. Head over to the [Releases](https://github.com/AliendsOG/Better-Music/releases) page of this repository.
2. Download the latest release `.zip` file compiled for your operating system.
3. Extract the contents of the ZIP file to a folder of your choice.
4. Launch the application executable (e.g., `Better-Music.exe` or the platform equivalent) to start listening!

---

## 🛠️ Built With

* **Electron** – Powering native desktop performance, cross-platform accessibility, and window management.
* **SQLite 3** – Providing a lightweight, robust local relational database to manage track metadata, playlists, and analytics.
* **HTML5 / SCSS / JavaScript** – Crafting a responsive, fluid, and modern user interface.

---

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
---

## 🤖 AI Attribution & Learning

This project was built as an active learning experience. Gemini  was used as a development collaborator and educational guide to learn:
* Architectural patterns, ipcMain/ipcRenderer communication, and window lifecycles in **Electron**.
* Local schema design, query structure, and data persistence tracking using **SQLite 3**.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/AliendsOG/Better-Music/issues) if you want to report a bug or suggest an improvement.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## Future Roadmap

In the future I am looking forward to adding new features to the app such as:
- Adding a listening history page where the user can look through their history and have some statistics or even badges for listening to an artist for x amount of time.
- Making the app compatible with the listening history JSON files that Spotify gives you and importing them into the app so the user doesn't lose their listening data if they switch.
- Porting the app to Android (I don't have a Mac nor an iPhone to port it to iOS) using Capacitor.
- Bug fixes.




