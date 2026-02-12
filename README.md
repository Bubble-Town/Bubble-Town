# Frutiger World 🌍

A nostalgic Frutiger Aero themed isometric virtual world inspired by Habbo Hotel and Club Penguin, featuring Windows XP aesthetics and MSN-style avatars.

![Frutiger Aero Theme](https://img.shields.io/badge/theme-Frutiger%20Aero-blue)
![Windows XP](https://img.shields.io/badge/style-Windows%20XP-green)

## Features

### Core Experience
- 🏙️ **Isometric Eco Town** - Habbo Hotel/Club Penguin style virtual world
- 🪟 **Windows XP UI** - Classic blue title bars, rounded buttons, authentic XP look
- 👤 **MSN-Style Avatars** - 6 pastel colors with smooth animations
- 💬 **Real-time Chat** - Speech bubbles above avatars + minimizable chat history

### Avatar Colors
- 🩵 Aqua
- 💙 Sky Blue
- 💚 Mint Green
- 💛 Lemon
- 🩷 Bubblegum Pink
- 💜 Lavender

### Aquarium Feature
- 🐠 **Clickable Aquarium** in the town opens fullscreen aquarium room
- 🎵 **Soft Ambient Music** plays while viewing
- ⏱️ **Time Tracking**:
  - 1 hour = Unlock Clownfish pet
  - 6 hours = Unlock Dolphin pet
- 🐾 **Pets Follow Avatar** - Equip in customization page

### Admin Features
- Specific admin accounts get all pets automatically

## Tech Stack
- **Firebase** - Authentication, Realtime Database
- **Vanilla JavaScript** - ES6 modules
- **CSS3** - Frutiger Aero effects with animations
- **Netlify** - Free hosting

## Getting Started

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password and Google)
4. Create a Realtime Database
5. Copy your config and replace in `js/firebase-config.js`

### 2. Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=.
```

Or drag and drop the project folder to [Netlify Drop](https://app.netlify.com/drop)

### 3. Set Admin Email
Edit `js/auth.js` and change `ADMIN_EMAIL` to your admin email:
```javascript
const ADMIN_EMAIL = 'your-email@example.com';
```

## Controls
- **Click** in the world to move your avatar
- **T** key to quickly open chat
- **ESC** to close modals

## Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License
MIT

---

Built with 💙 for the Frutiger Aero aesthetic