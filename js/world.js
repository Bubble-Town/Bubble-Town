// World Manager Module
import { database, ref, onValue } from './firebase-config.js';
import { getCurrentUser } from './auth.js';

class WorldManager {
    constructor() {
        this.currentUser = null;
        this.gridSize = 8;
    }

    init(user) {
        this.currentUser = user;
        this.generateGrid();
        this.setupEventListeners();
        this.listenToWorldState();
    }

    generateGrid() {
        const grid = document.querySelector('.world-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const tile = document.createElement('div');
            tile.className = 'grid-tile';
            
            // Add some variation to tiles
            const variation = Math.random();
            if (variation > 0.7) {
                tile.style.background = 'linear-gradient(135deg, rgba(144, 238, 144, 0.7) 0%, rgba(152, 251, 152, 0.9) 100%)';
            } else if (variation < 0.3) {
                tile.style.background = 'linear-gradient(135deg, rgba(152, 251, 152, 0.9) 0%, rgba(144, 238, 144, 0.7) 100%)';
            }
            
            grid.appendChild(tile);
        }
    }

    setupEventListeners() {
        // Window controls
        document.querySelectorAll('.xp-minimize').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const window = btn.closest('.xp-window');
                window.classList.add('minimized');
            });
        });

        document.querySelectorAll('.xp-maximize').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const window = btn.closest('.xp-window');
                window.classList.toggle('maximized');
            });
        });

        document.querySelectorAll('.xp-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const window = btn.closest('.xp-window');
                if (window.id !== 'authModal') {
                    window.classList.add('hidden');
                }
            });
        });

        // Taskbar items
        document.querySelectorAll('.taskbar-item').forEach(item => {
            item.addEventListener('click', () => {
                const windowType = item.dataset.window;
                
                // Update active state
                document.querySelectorAll('.taskbar-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Show corresponding window
                if (windowType === 'world') {
                    document.getElementById('worldWindow').classList.remove('hidden');
                }
            });
        });

        // Start button
        document.querySelector('.xp-start-btn')?.addEventListener('click', () => {
            // Could show start menu here
            alert('Frutiger World v1.0\n\nWelcome to your eco-friendly virtual world!');
        });
    }

    listenToWorldState() {
        // Listen to online users count
        const presenceRef = ref(database, 'presence');
        
        onValue(presenceRef, (snapshot) => {
            const data = snapshot.val();
            const count = data ? Object.keys(data).length : 0;
            
            // Update world title with user count
            const title = document.querySelector('#worldWindow .xp-title');
            if (title) {
                title.textContent = `Frutiger Eco Town (${count} online)`;
            }
        });
    }

    // Generate random position within grid
    getRandomPosition() {
        return {
            x: Math.random() * (this.gridSize - 2) + 1,
            y: Math.random() * (this.gridSize - 2) + 1
        };
    }
}

// Create global instance
const worldManager = new WorldManager();
window.worldManager = worldManager;

export default worldManager;