// Authentication Module
import { 
    auth, 
    database,
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
    ref,
    set,
    get
} from './firebase-config.js';

// Admin email (change this to your admin email)
const ADMIN_EMAIL = 'a.hannaway.contact@gmail.com';

// Current user state
let currentUser = null;
let userData = null;

// DOM Elements (lazy load)
let authModal, gameInterface, userBar;

function getElements() {
    if (!authModal) {
        authModal = document.getElementById('authModal');
        gameInterface = document.getElementById('gameInterface');
        userBar = document.getElementById('userBar');
    }
}

// Auth state listener
onAuthStateChanged(auth, async (user) => {
    getElements();
    if (user) {
        currentUser = user;
        await loadUserData(user.uid);
        showGameInterface();
        updateUserBar();
        
        // Initialize world
        if (window.worldManager) {
            window.worldManager.init(user);
        }
        if (window.chatManager) {
            window.chatManager.init(user);
        }
        if (window.avatarManager) {
            window.avatarManager.init(user);
        }
    } else {
        currentUser = null;
        userData = null;
        showAuthModal();
    }
});

// Load user data from database
async function loadUserData(uid) {
    try {
        const userRef = ref(database, `users/${uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            userData = snapshot.val();
        } else {
            // Create new user data
            userData = createDefaultUserData();
            await set(userRef, userData);
        }
        
        // Check if admin
        if (currentUser.email === ADMIN_EMAIL) {
            userData.isAdmin = true;
            userData.pets = ['clownfish', 'dolphin'];
            userData.equippedPet = userData.equippedPet || 'clownfish';
            await set(userRef, userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        userData = createDefaultUserData();
    }
}

// Create default user data
function createDefaultUserData() {
    return {
        color: 'aqua',
        pets: [],
        equippedPet: null,
        aquariumTime: 0,
        isAdmin: false,
        isBlocked: false,
        blockedReason: null,
        blockedAt: null,
        ageVerified: false,
        isAdult: false,
        birthDate: null,
        unlockedClownfish: false,
        unlockedDolphin: false,
        joinedAt: Date.now()
    };
}

// Show auth modal
function showAuthModal() {
    getElements();
    if (authModal) authModal.classList.remove('hidden');
    if (gameInterface) gameInterface.classList.add('hidden');
    if (userBar) userBar.classList.add('hidden');
}

// Show game interface
function showGameInterface() {
    getElements();
    // Check if user is blocked
    if (userData?.isBlocked) {
        alert('Your account has been blocked. Reason: ' + (userData.blockedReason || 'Violation of community guidelines'));
        signOut(auth);
        return;
    }
    if (authModal) authModal.classList.add('hidden');
    if (gameInterface) gameInterface.classList.remove('hidden');
    if (userBar) userBar.classList.remove('hidden');
}

// Update user bar
function updateUserBar() {
    if (!currentUser) return;
    
    const userNameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatarSmall');
    
    if (userNameEl) userNameEl.textContent = currentUser.displayName || 'User';
    if (avatarEl) avatarEl.setAttribute('data-color', userData?.color || 'aqua');
}

// Email/Password Registration
document.getElementById('registerBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const birthDate = document.getElementById('registerBirthDate').value;
    const ageConfirmed = document.getElementById('ageConfirm').checked;
    const color = document.querySelector('.color-option.selected')?.dataset.color || 'aqua';
    
    if (!name || !email || !password || !birthDate) {
        alert('Please fill in all fields');
        return;
    }
    
    if (!ageConfirmed) {
        alert('You must confirm you are 13 years or older');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    // Calculate age
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    if (age < 13) {
        alert('You must be at least 13 years old to use this site');
        return;
    }
    
    const isAdult = age >= 18;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Create user data
        const userData = {
            color: color,
            pets: [],
            equippedPet: null,
            aquariumTime: 0,
            isAdmin: email === ADMIN_EMAIL,
            isBlocked: false,
            ageVerified: true,
            isAdult: isAdult,
            birthDate: birthDate,
            unlockedClownfish: email === ADMIN_EMAIL,
            unlockedDolphin: email === ADMIN_EMAIL,
            joinedAt: Date.now()
        };
        
        if (email === ADMIN_EMAIL) {
            userData.pets = ['clownfish', 'dolphin'];
            userData.equippedPet = 'clownfish';
        }
        
        await set(ref(database, `users/${userCredential.user.uid}`), userData);
        
    } catch (error) {
        alert('Registration error: ' + error.message);
    }
});

// Email/Password Login
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Login error: ' + error.message);
    }
});

// Show age verification modal for Google users
function showAgeVerificationModal(user) {
    const modal = document.createElement('div');
    modal.id = 'ageVerifyModal';
    modal.className = 'xp-window modal-center';
    modal.innerHTML = `
        <div class="xp-title-bar">
            <span class="xp-icon">🎂</span>
            <span class="xp-title">Age Verification Required</span>
        </div>
        <div class="xp-content">
            <p>Please enter your date of birth to continue:</p>
            <div class="form-group">
                <label>Date of Birth:</label>
                <input type="date" id="googleBirthDate" class="xp-input" required>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="googleAgeConfirm" required>
                    <span>I confirm I am 13 years or older</span>
                </label>
            </div>
            <button id="verifyAgeBtn" class="xp-button-primary">Verify & Continue</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('verifyAgeBtn').addEventListener('click', async () => {
        const birthDate = document.getElementById('googleBirthDate').value;
        const ageConfirmed = document.getElementById('googleAgeConfirm').checked;
        
        if (!birthDate || !ageConfirmed) {
            alert('Please complete all fields');
            return;
        }
        
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        if (age < 13) {
            alert('You must be at least 13 years old to use this site');
            await signOut(auth);
            return;
        }
        
        const isAdult = age >= 18;
        
        const userData = {
            color: 'aqua',
            pets: [],
            equippedPet: null,
            aquariumTime: 0,
            isAdmin: user.email === ADMIN_EMAIL,
            isBlocked: false,
            ageVerified: true,
            isAdult: isAdult,
            birthDate: birthDate,
            unlockedClownfish: user.email === ADMIN_EMAIL,
            unlockedDolphin: user.email === ADMIN_EMAIL,
            joinedAt: Date.now()
        };
        
        if (user.email === ADMIN_EMAIL) {
            userData.pets = ['clownfish', 'dolphin'];
            userData.equippedPet = 'clownfish';
        }
        
        await set(ref(database, `users/${user.uid}`), userData);
        modal.remove();
    });
}

// Google Sign In
document.getElementById('googleSignIn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Google sign-in clicked');
    
    try {
        console.log('Starting Google sign-in...');
        const result = await signInWithPopup(auth, googleProvider);
        console.log('Google sign-in result:', result);
        const user = result.user;
        
        // Check if new user
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            // Show age verification for new Google users
            showAgeVerificationModal(user);
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
        alert('Google sign-in error: ' + error.message);
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Color picker selection
document.querySelectorAll('.color-picker .color-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.color-picker .color-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
    });
});

// Select first color by default
document.querySelector('.color-picker .color-option')?.classList.add('selected');

// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.getElementById('loginForm')?.classList.add('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        
        if (targetTab === 'login') {
            document.getElementById('loginForm')?.classList.remove('hidden');
        } else {
            document.getElementById('registerForm')?.classList.remove('hidden');
        }
    });
});

// Admin: Block a user
export async function blockUser(uid, reason) {
    if (!userData?.isAdmin) {
        console.error('Only admins can block users');
        return false;
    }
    
    try {
        const userRef = ref(database, `users/${uid}`);
        await set(userRef, {
            ...await get(userRef).then(s => s.val()),
            isBlocked: true,
            blockedReason: reason,
            blockedAt: Date.now()
        });
        return true;
    } catch (error) {
        console.error('Error blocking user:', error);
        return false;
    }
}

// Admin: Unblock a user
export async function unblockUser(uid) {
    if (!userData?.isAdmin) {
        console.error('Only admins can unblock users');
        return false;
    }
    
    try {
        const userRef = ref(database, `users/${uid}`);
        await set(userRef, {
            ...await get(userRef).then(s => s.val()),
            isBlocked: false,
            blockedReason: null,
            blockedAt: null
        });
        return true;
    } catch (error) {
        console.error('Error unblocking user:', error);
        return false;
    }
}

// Getters
export function getCurrentUser() { return currentUser; }
export function getUserData() { return userData; }
export function updateUserData(newData) { userData = { ...userData, ...newData }; }
export { ADMIN_EMAIL };