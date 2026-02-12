// Main Application Entry Point
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Import managers
import './auth.js';
import './avatar.js';
import './chat.js';
import './aquarium.js';
import './world.js';
import './social.js';

// App initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('🫧 Bubble Town loading...');
    
    // Initialize clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Wait for auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('✅ User authenticated:', user.displayName || user.email);
            
            // Initialize managers after auth
            setTimeout(() => {
                if (window.worldManager) {
                    window.worldManager.init(user);
                }
                if (window.avatarManager) {
                    window.avatarManager.init(user);
                }
                if (window.chatManager) {
                    window.chatManager.init(user);
                }
                if (window.aquariumManager) {
                    window.aquariumManager.init();
                }
                if (window.socialManager) {
                    window.socialManager.init(user);
                }
                
                // Welcome message
                setTimeout(() => {
                    if (window.chatManager) {
                        window.chatManager.addSystemMessage(
                            `👋 Welcome to Bubble Town, ${user.displayName || 'Friend'}!`
                        );
                        window.chatManager.addSystemMessage(
                            '💡 Tip: Click anywhere in the world to move your avatar!'
                        );
                    }
                }, 1000);
            }, 100);
        } else {
            console.log('🔒 No user signed in');
        }
    });
    
    // Prevent context menu on right click (for that authentic feel)
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.isometric-world')) {
            e.preventDefault();
        }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // ESC to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.fullscreen-modal:not(.hidden)');
            modals.forEach(modal => {
                if (modal.id === 'aquariumModal') {
                    window.aquariumManager?.closeAquarium();
                } else {
                    modal.classList.add('hidden');
                }
            });
        }
        
        // T to focus chat
        if (e.key === 't' || e.key === 'T') {
            const chatInput = document.getElementById('chatInput');
            const chatWindow = document.getElementById('chatWindow');
            
            if (chatInput && document.activeElement !== chatInput) {
                e.preventDefault();
                chatWindow.classList.remove('minimized');
                chatInput.focus();
            }
        }
    });
});

// Clock updater
function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
        });
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    // Adjust any responsive elements if needed
});

// Handle before unload (save state)
window.addEventListener('beforeunload', () => {
    if (window.aquariumManager?.isOpen) {
        window.aquariumManager.closeAquarium();
    }
});

console.log('🫧 Bubble Town v1.0');