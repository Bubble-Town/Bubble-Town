// Avatar Manager Module
import { database, ref, set, onValue, update } from './firebase-config.js';
import { getCurrentUser, getUserData, updateUserData } from './auth.js';

class AvatarManager {
    constructor() {
        this.avatars = new Map();
        this.currentUser = null;
        this.selectedColor = 'aqua';
        this.container = document.getElementById('avatarsContainer');
        this.userRef = null;
        this.presenceRef = null;
    }

    init(user) {
        this.currentUser = user;
        this.setupPresence();
        this.listenToAvatars();
        this.setupCustomization();
    }

    // Set up user presence in the world
    setupPresence() {
        if (!this.currentUser) return;

        const userData = getUserData();
        this.presenceRef = ref(database, `presence/${this.currentUser.uid}`);
        
        const presence = {
            name: this.currentUser.displayName || 'User',
            color: userData?.color || 'aqua',
            equippedPet: userData?.equippedPet || null,
            x: 4,
            y: 4,
            lastSeen: Date.now()
        };

        set(this.presenceRef, presence);
        
        // Update position periodically
        setInterval(() => {
            if (this.presenceRef) {
                update(this.presenceRef, { lastSeen: Date.now() });
            }
        }, 30000);
    }

    // Listen to all avatars in the world
    listenToAvatars() {
        const presenceRef = ref(database, 'presence');
        
        onValue(presenceRef, (snapshot) => {
            const data = snapshot.val();
            this.container.innerHTML = '';
            this.avatars.clear();

            if (data) {
                Object.entries(data).forEach(([uid, userData]) => {
                    // Skip if inactive for more than 5 minutes
                    if (Date.now() - userData.lastSeen > 300000) return;
                    
                    this.createAvatar(uid, userData);
                });
            }
        });
    }

    // Create an avatar element
    createAvatar(uid, userData) {
        const isCurrentUser = uid === this.currentUser?.uid;
        
        const avatarEl = document.createElement('div');
        avatarEl.className = `msn-avatar world-avatar ${isCurrentUser ? 'current-user' : ''}`;
        avatarEl.setAttribute('data-color', userData.color);
        avatarEl.setAttribute('data-uid', uid);
        
        // Position on grid (isometric coordinates)
        const x = (userData.x || 4) * 12.5 - 6.25; // Convert grid to percentage
        const y = (userData.y || 4) * 12.5 - 6.25;
        
        avatarEl.style.left = `${x}%`;
        avatarEl.style.top = `${y}%`;
        
        // Name tag
        const nameTag = document.createElement('div');
        nameTag.className = 'avatar-name-tag';
        nameTag.textContent = userData.name;
        avatarEl.appendChild(nameTag);
        
        // Add pet if equipped
        if (userData.equippedPet) {
            const petEl = document.createElement('div');
            petEl.className = `pet pet-${userData.equippedPet}`;
            avatarEl.appendChild(petEl);
        }
        
        // Click to move (for current user)
        if (isCurrentUser) {
            avatarEl.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Make world clickable for movement
            document.getElementById('isometricWorld').addEventListener('click', (e) => {
                this.moveToClick(e);
            });
        }
        
        this.container.appendChild(avatarEl);
        this.avatars.set(uid, { element: avatarEl, data: userData });
    }

    // Move avatar to clicked position
    moveToClick(e) {
        if (!this.currentUser) return;

        const world = document.getElementById('isometricWorld');
        const rect = world.getBoundingClientRect();
        
        const x = ((e.clientX - rect.left) / rect.width) * 8;
        const y = ((e.clientY - rect.top) / rect.height) * 8;
        
        // Clamp to grid
        const clampedX = Math.max(0.5, Math.min(7.5, x));
        const clampedY = Math.max(0.5, Math.min(7.5, y));
        
        // Update in database
        update(this.presenceRef, {
            x: clampedX,
            y: clampedY
        });
    }

    // Setup customization modal
    setupCustomization() {
        const customizeModal = document.getElementById('customizeModal');
        const previewAvatar = document.getElementById('previewAvatar');
        const colorOptions = customizeModal.querySelectorAll('.color-option');
        const petSelect = document.getElementById('petSelect');
        const userPetsContainer = document.getElementById('userPets');
        
        // Color selection
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedColor = option.dataset.color;
                previewAvatar.setAttribute('data-color', this.selectedColor);
            });
        });

        // Open customize modal
        document.querySelector('[data-window="customize"]')?.addEventListener('click', () => {
            this.updateCustomizeModal();
            customizeModal.classList.remove('hidden');
        });

        // Close customize modal
        document.getElementById('closeCustomize')?.addEventListener('click', () => {
            customizeModal.classList.add('hidden');
        });

        // Save changes
        document.getElementById('saveCustomize')?.addEventListener('click', async () => {
            const selectedPet = petSelect.value;
            const selectedColorEl = customizeModal.querySelector('.color-option.selected');
            const newColor = selectedColorEl?.dataset.color || getUserData()?.color;
            
            const updates = {
                color: newColor,
                equippedPet: selectedPet || null
            };
            
            // Update database
            await update(ref(database, `users/${this.currentUser.uid}`), updates);
            await update(this.presenceRef, updates);
            
            // Update local data
            updateUserData(updates);
            
            // Update UI
            document.getElementById('userAvatarSmall').setAttribute('data-color', newColor);
            
            customizeModal.classList.add('hidden');
        });
    }

    // Update customize modal with current data
    updateCustomizeModal() {
        const userData = getUserData();
        if (!userData) return;

        const customizeModal = document.getElementById('customizeModal');
        const previewAvatar = document.getElementById('previewAvatar');
        const petSelect = document.getElementById('petSelect');
        const userPetsContainer = document.getElementById('userPets');

        // Set current color
        previewAvatar.setAttribute('data-color', userData.color);
        customizeModal.querySelectorAll('.color-option').forEach(o => {
            o.classList.toggle('selected', o.dataset.color === userData.color);
        });

        // Populate pets
        petSelect.innerHTML = '<option value="">No pet</option>';
        userPetsContainer.innerHTML = '';

        if (userData.pets && userData.pets.length > 0) {
            userData.pets.forEach(pet => {
                // Add to select
                const option = document.createElement('option');
                option.value = pet;
                option.textContent = pet.charAt(0).toUpperCase() + pet.slice(1);
                option.selected = userData.equippedPet === pet;
                petSelect.appendChild(option);

                // Add to inventory display
                const petItem = document.createElement('div');
                petItem.className = 'pet-item';
                petItem.innerHTML = `
                    <span class="pet-icon">${pet === 'clownfish' ? '🐠' : '🐬'}</span>
                    <span>${pet.charAt(0).toUpperCase() + pet.slice(1)}</span>
                `;
                userPetsContainer.appendChild(petItem);
            });
        } else {
            userPetsContainer.innerHTML = '<p class="no-pets">Visit the aquarium to unlock pets!</p>';
        }
    }

    // Update avatar position
    updatePosition(uid, x, y) {
        const avatar = this.avatars.get(uid);
        if (avatar && avatar.element) {
            const xPct = x * 12.5 - 6.25;
            const yPct = y * 12.5 - 6.25;
            avatar.element.style.left = `${xPct}%`;
            avatar.element.style.top = `${yPct}%`;
        }
    }
}

// Create global instance
const avatarManager = new AvatarManager();
window.avatarManager = avatarManager;

export default avatarManager;