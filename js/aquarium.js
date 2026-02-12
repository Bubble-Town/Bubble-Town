// Aquarium Manager Module
import { database, ref, update, get } from './firebase-config.js';
import { getCurrentUser, getUserData, updateUserData, ADMIN_EMAIL } from './auth.js';

class AquariumManager {
    constructor() {
        this.isOpen = false;
        this.startTime = 0;
        this.totalTime = 0;
        this.timerInterval = null;
        this.musicPlaying = false;
        this.currentUser = null;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Open aquarium from building click
        document.getElementById('aquariumBuilding')?.addEventListener('click', () => {
            this.openAquarium();
        });

        // Open from taskbar
        document.querySelector('[data-window="aquarium"]')?.addEventListener('click', () => {
            this.openAquarium();
        });

        // Close aquarium
        document.getElementById('closeAquarium')?.addEventListener('click', () => {
            this.closeAquarium();
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeAquarium();
            }
        });
    }

    async openAquarium() {
        this.currentUser = getCurrentUser();
        if (!this.currentUser) return;

        this.isOpen = true;
        this.startTime = Date.now();

        // Load saved aquarium time
        const userData = getUserData();
        this.totalTime = userData?.aquariumTime || 0;

        // Show modal
        const modal = document.getElementById('aquariumModal');
        modal.classList.remove('hidden');

        // Start ambient music
        this.playMusic();

        // Start timer
        this.startTimer();

        // Check unlocks
        this.updateUnlockProgress();

        // Show dolphin if unlocked
        if (userData?.unlockedDolphin || userData?.isAdmin) {
            document.getElementById('dolphinContainer').classList.remove('hidden');
        }
    }

    closeAquarium() {
        if (!this.isOpen) return;

        this.isOpen = false;

        // Save total time
        const sessionTime = Math.floor((Date.now() - this.startTime) / 1000);
        this.totalTime += sessionTime;

        // Update database
        if (this.currentUser) {
            this.saveAquariumTime();
        }

        // Hide modal
        document.getElementById('aquariumModal').classList.add('hidden');

        // Stop music
        this.stopMusic();

        // Stop timer
        this.stopTimer();
    }

    startTimer() {
        this.updateTimeDisplay();
        
        this.timerInterval = setInterval(() => {
            const sessionTime = Math.floor((Date.now() - this.startTime) / 1000);
            const totalSeconds = this.totalTime + sessionTime;
            
            this.updateTimeDisplay(totalSeconds);
            this.checkUnlocks(totalSeconds);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimeDisplay(totalSeconds = 0) {
        const sessionTime = Math.floor((Date.now() - this.startTime) / 1000);
        const displayTime = totalSeconds || (this.totalTime + sessionTime);
        
        const hours = Math.floor(displayTime / 3600);
        const minutes = Math.floor((displayTime % 3600) / 60);
        const seconds = displayTime % 60;
        
        const timeStr = hours > 0 
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            : `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('aquariumTime').textContent = timeStr;
    }

    checkUnlocks(totalSeconds) {
        const userData = getUserData();
        if (!userData || userData.isAdmin) return;

        const hours = totalSeconds / 3600;
        let unlocked = false;

        // Check clownfish (1 hour)
        if (hours >= 1 && !userData.unlockedClownfish) {
            this.unlockPet('clownfish');
            unlocked = true;
        }

        // Check dolphin (6 hours)
        if (hours >= 6 && !userData.unlockedDolphin) {
            this.unlockPet('dolphin');
            unlocked = true;
            
            // Show dolphin in aquarium
            document.getElementById('dolphinContainer').classList.remove('hidden');
        }

        if (unlocked) {
            this.updateUnlockProgress();
        }
    }

    async unlockPet(petType) {
        if (!this.currentUser) return;

        const userData = getUserData();
        const updates = {};

        if (petType === 'clownfish') {
            updates.unlockedClownfish = true;
        } else if (petType === 'dolphin') {
            updates.unlockedDolphin = true;
        }

        // Add to pets array if not already there
        const currentPets = userData.pets || [];
        if (!currentPets.includes(petType)) {
            updates.pets = [...currentPets, petType];
        }

        // Update database
        await update(ref(database, `users/${this.currentUser.uid}`), updates);
        
        // Update local data
        updateUserData(updates);

        // Show notification
        if (window.chatManager) {
            window.chatManager.addSystemMessage(
                `🎉 Congratulations! You unlocked the ${petType === 'clownfish' ? '🐠 Clownfish' : '🐬 Dolphin'} pet!`
            );
        }
    }

    updateUnlockProgress() {
        const userData = getUserData();
        if (!userData) return;

        const clownfishEl = document.getElementById('clownfishUnlock');
        const dolphinEl = document.getElementById('dolphinUnlock');

        // Update clownfish status
        if (userData.unlockedClownfish || userData.isAdmin) {
            clownfishEl.classList.add('unlocked');
            clownfishEl.querySelector('.reward-status').textContent = '✓';
            clownfishEl.querySelector('.reward-status').classList.remove('locked');
            clownfishEl.querySelector('.reward-status').classList.add('unlocked');
        }

        // Update dolphin status
        if (userData.unlockedDolphin || userData.isAdmin) {
            dolphinEl.classList.add('unlocked');
            dolphinEl.querySelector('.reward-status').textContent = '✓';
            dolphinEl.querySelector('.reward-status').classList.remove('locked');
            dolphinEl.querySelector('.reward-status').classList.add('unlocked');
        }
    }

    async saveAquariumTime() {
        if (!this.currentUser) return;

        const updates = {
            aquariumTime: this.totalTime
        };

        await update(ref(database, `users/${this.currentUser.uid}`), updates);
        updateUserData(updates);
    }

    playMusic() {
        const music = document.getElementById('ambientMusic');
        if (music) {
            music.volume = 0.3;
            music.play().catch(() => {
                // Autoplay blocked, user needs to interact
            });
            this.musicPlaying = true;
        }
    }

    stopMusic() {
        const music = document.getElementById('ambientMusic');
        if (music) {
            music.pause();
            music.currentTime = 0;
            this.musicPlaying = false;
        }
    }

    // Get total aquarium time in hours
    getTotalHours() {
        return Math.floor(this.totalTime / 3600);
    }
}

// Create global instance
const aquariumManager = new AquariumManager();
window.aquariumManager = aquariumManager;

export default aquariumManager;