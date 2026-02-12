// Main Application Entry Point
import { initAuth } from './auth.js';

// Import other modules
import './avatar.js';
import './chat.js';
import './aquarium.js';
import './world.js';
import './social.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🫧 Bubble Town loading...');
    
    // Initialize auth (this attaches button listeners)
    initAuth();
    
    // Clock updater
    function updateClock() {
        const clock = document.getElementById('clock');
        if (clock) {
            clock.textContent = new Date().toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit'
            });
        }
    }
    
    updateClock();
    setInterval(updateClock, 1000);
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.isometric-world')) {
            e.preventDefault();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.fullscreen-modal:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
        
        if (e.key === 't' || e.key === 'T') {
            const chatInput = document.getElementById('chatInput');
            const chatWindow = document.getElementById('chatWindow');
            
            if (chatInput && document.activeElement !== chatInput) {
                e.preventDefault();
                if (chatWindow) chatWindow.classList.remove('minimized');
                chatInput.focus();
            }
        }
    });
});

console.log('🫧 Bubble Town v1.0');
