# KitsuneWatch 🦊

**KitsuneWatch** is a modern, progressive web application (PWA) for discovering and streaming anime content. Named after the mystical nine-tailed fox spirit from Japanese folklore, KitsuneWatch provides a sleek, user-friendly interface for anime enthusiasts to search, watch, and organize their favorite titles.

> **Note:** All video content is sourced from the open API provided by [Kodik](https://bd.kodikres.com/films). KitsuneWatch does not host, store, or distribute any video files.

---

## ✨ Features

### Core Functionality

- 🔍 **Smart Search** — Find anime by title, year, or type with real-time results
- 🎬 **HD Streaming** — Watch anime in high quality with multiple voice-over options
- 📑 **Tab Filtering** — Organize search results by content type (anime, movies, series)
- 🎯 **Grouped Results** — Duplicate titles are grouped by year and type for cleaner browsing
- 📺 **Integrated Player** — Seamless playback using the Kodik player API

### User Experience

- ❤️ **Favorites System** — Save your favorite titles for quick access
- 🕐 **Search History** — Automatically track and revisit recent searches
- 📋 **Share Support** — Share links via Web Share API or clipboard
- ⌨️ **Keyboard Shortcuts** — Full playback control without a mouse
- 📱 **Responsive Design** — Optimized for desktop, tablet, and mobile devices
- 🌙 **Dark Theme** — Eye-friendly dark mode with animated background

### Progressive Web App (PWA)

- 📲 **Installable** — Add to home screen for native app experience
- 🔄 **Offline Support** — Service Worker with smart caching strategies
- 🔔 **Push Notifications** — Stay updated with new content
- 🔗 **Share Target** — Receive shared links from other apps
- 📡 **Protocol Handler** — Custom `web+KitsuneWatch://` protocol support
- 🔄 **Background Sync** — Synchronize data when connection is restored

### Security Features

- 🛡️ **XSS Protection** — Input sanitization and URL validation
- 🔒 **Clickjacking Prevention** — Frame-busting protection
- 🚫 **Content Protection** — Disable copy, drag, and context menu on player
- ⏱️ **Request Timeout** — Automatic abort for hung requests
- 🌐 **CSP Support** — Compatible with Content Security Policy headers

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher) for Vercel deployment
- [Git](https://git-scm.com/) for version control
- A Kodik API token (free registration at [kodik-api.com](https://kodik-api.com))

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/PsyGioX/kitsunewatch.git
cd kitsunewatch
```

2. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and add your API token:

```env
KODIK_API_TOKEN=your_token_here
KODIK_API_URL=https://kodik-api.com/search
APP_NAME=KitsuneWatch
APP_URL=http://localhost:3000
APP_ENV=development
```

3. **Run locally:**

**Option A: Using a simple HTTP server**

```bash
# Using Python
python -m http.server 3000

# Using Node.js
npx serve .

# Using VS Code Live Server
# Right-click index.html → "Open with Live Server"
```

**Option B: Using Vite (recommended for development)**

```bash
npm install
npm run dev
```

**Option C: Using Next.js (for Vercel deployment)**

```bash
npm install
npm run build
npm start
```

4. **Open in browser:**

Navigate to `http://localhost:3000`

---

## 📁 Project Structure

```text
kitsunewatch/
├── index.html              # Main HTML file
├── site.webmanifest        # PWA manifest
├── sw.js                   # Service Worker
├── .env.example            # Environment variables template
├── .env                    # Environment variables (gitignored)
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
├── LICENSE                 # MIT License
├── assets/
│   ├── styles/
│   │   └── index.css       # Main stylesheet
│   └── scripts/
│       └── index.js        # Main JavaScript application
├── icons/
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
└── screenshots/
    ├── desktop.png
    └── mobile.png
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `KODIK_API_TOKEN` | Kodik API authentication token | Yes | — |
| `KODIK_API_URL` | Kodik API endpoint | No | `https://kodik-api.com/search` |
| `APP_NAME` | Application name | No | `KitsuneWatch` |
| `APP_URL` | Application URL | No | `http://localhost:3000` |
| `APP_ENV` | Environment (`development`/`production`) | No | `development` |

### Vercel Deployment

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add environment variables in **Settings → Environment Variables**.
4. Deploy the project.

```bash
# Using Vercel CLI
vercel
vercel --prod
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `→` | Forward 10 seconds |
| `←` | Backward 10 seconds |
| `↑` | Increase volume |
| `↓` | Decrease volume |
| `M` | Mute/Unmute |
| `F` | Toggle fullscreen |

---

## 🛠️ Built With

- **[Kodik API](https://kodik-api.com)** — Video content and streaming
- **[Bootstrap 5](https://getbootstrap.com)** — CSS framework
- **[Bootstrap Icons](https://icons.getbootstrap.com)** — Icon library
- **[Roboto Font](https://fonts.google.com/specimen/Roboto)** — Typography
- **[Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)** — PWA support
- **[Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)** — PWA configuration
- **[Vercel](https://vercel.com)** — Deployment platform

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes:

```bash
git commit -m "Add amazing feature"
```

4. Push the branch:

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

KitsuneWatch is a non-commercial, educational project. All video content is sourced from the open API provided by [Kodik](https://bd.kodikres.com/films). We do not host, store, distribute, or claim ownership of any video files or content.

All anime, movies, and series are the property of their respective copyright holders. If you are a copyright holder and believe your content is being used improperly, please contact us for immediate removal.

---

## 🙏 Acknowledgments

### Content Provider

Special thanks to **[Kodik](https://bd.kodikres.com/films)** for providing the open API that makes this project possible.

### Framework & Libraries

- **Bootstrap Team** — For the excellent CSS framework and icon library
- **Google Fonts** — For the Roboto font family
- **Vercel** — For the deployment platform

### Open Source Community

- All contributors who have helped improve this project
- The developer community for inspiration and support

---

## 📊 Project Status

- **Current Version:** 1.0.0
- **Status:** Active Development
- **Last Updated:** August 17, 2026

---

**Made with ❤️ for the anime community**

[⬆ Back to Top](#kitsunewatch-)
