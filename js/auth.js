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

// Admin email
const ADMIN_EMAIL = 'a.hannaway.contact@gmail.com';

// Current user state
let currentUser = null;
let userData = null;

// DOM Elements cache
let authModal, gameInterface, userBar;

// Initialize auth when DOM is ready
export function initAuth() {
    console.log('🔐 Initializing auth...');
    
    // Cache DOM elements
    authModal = document.getElementById('authModal');
    gameInterface = document.getElementById('gameInterface');
    userBar = document.getElementById('userBar');
    
    // Attach event listeners
    attachEventListeners();
    
    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            showGameInterface();
            
            // Initialize other managers
            setTimeout(() => {
                if (window.worldManager) window.worldManager.init(user);
                if (window.avatarManager) window.avatarManager.init(user);
                if (window.chatManager) window.chatManager.init(user);
                if (window.aquariumManager) window.aquariumManager.init();
                if (window.socialManager) window.socialManager.init(user);
            }, 100);
        } else {
            currentUser = null;
            userData = null;
            showAuthModal();
        }
    });
}

function attachEventListeners() {
    console.log('🎧 Attaching auth event listeners...');
    
    // Register button
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
        console.log('✅ Register button attached');
    } else {
        console.error('❌ Register button not found');
    }
    
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
        console.log('✅ Login button attached');
    } else {
        console.error('❌ Login button not found');
    }
    
    // Google Sign In button
    const googleSignIn = document.getElementById('googleSignIn');
    if (googleSignIn) {
        googleSignIn.addEventListener('click', handleGoogleSignIn);
        console.log('✅ Google sign-in button attached');
    } else {
        console.error('❌ Google sign-in button not found');
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout button attached');
    }
    
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            
            if (targetTab === 'login') {
                if (loginForm) loginForm.classList.remove('hidden');
                if (registerForm) registerForm.classList.add('hidden');
            } else {
                if (loginForm) loginForm.classList.add('hidden');
                if (registerForm) registerForm.classList.remove('hidden');
            }
        });
    });
    
    // Color picker
    document.querySelectorAll('.color-picker .color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-picker .color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    
    // Select first color by default
    const firstColor = document.querySelector('.color-picker .color-option');
    if (firstColor) firstColor.classList.add('selected');
}

async function handleRegister() {
    console.log('📝 Register clicked');
    
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const birthDateInput = document.getElementById('registerBirthDate');
    const ageConfirmInput = document.getElementById('ageConfirm');
    const colorOption = document.querySelector('.color-option.selected');
    
    if (!nameInput || !emailInput || !passwordInput || !birthDateInput) {
        alert('Please fill in all fields');
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const birthDate = birthDateInput.value;
    const ageConfirmed = ageConfirmInput?.checked;
    const color = colorOption?.dataset.color || 'aqua';
    
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
        console.log('✅ Registration successful');
        
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration error: ' + error.message);
    }
}

async function handleLogin() {
    console.log('🔑 Login clicked');
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) {
        alert('Please enter email and password');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Login successful');
    } catch (error) {
        console.error('Login error:', error);
        alert('Login error: ' + error.message);
    }
}

async function handleGoogleSignIn() {
    console.log('🔵 Google sign-in clicked');
    
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log('✅ Google sign-in result:', user);
        
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
}

async function handleLogout() {
    console.log('👋 Logout clicked');
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
    }
}

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

async function loadUserData(uid) {
    try {
        const userRef = ref(database, `users/${uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            userData = snapshot.val();
        } else {
            userData = createDefaultUserData();
            await set(userRef, userData);
        }
        
        // Check if admin
        if (currentUser?.email === ADMIN_EMAIL) {
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

function createDefaultUserData() {
    return {
        color: 'aqua',
        pets: [],
        equippedPet: null,
        aquariumTime: 0,
        isAdmin: false,
        isBlocked: false,
        ageVerified: false,
        isAdult: false,
        birthDate: null,
        unlockedClownfish: false,
        unlockedDolphin: false,
        joinedAt: Date.now()
    };
}

function showAuthModal() {
    if (authModal) authModal.classList.remove('hidden');
    if (gameInterface) gameInterface.classList.add('hidden');
    if (userBar) userBar.classList.add('hidden');
}

function showGameInterface() {
    if (userData?.isBlocked) {
        alert('Your account has been blocked. Reason: ' + (userData.blockedReason || 'Violation of community guidelines'));
        signOut(auth);
        return;
    }
    if (authModal) authModal.classList.add('hidden');
    if (gameInterface) gameInterface.classList.remove('hidden');
    if (userBar) userBar.classList.remove('hidden');
}

// Export functions
export function getCurrentUser() { return currentUser; }
export function getUserData() { return userData; }
export function updateUserData(newData) { userData = { ...userData, ...newData }; }

// Admin functions
export async function blockUser(uid, reason) {
    if (!userData?.isAdmin) {
        console.error('Only admins can block users');
        return false;
    }
    
    try {
        const userRef = ref(database, `users/${uid}`);
        const currentData = await get(userRef);
        await set(userRef, {
            ...currentData.val(),
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

export async function unblockUser(uid) {
    if (!userData?.isAdmin) {
        console.error('Only admins can unblock users');
        return false;
    }
    
    try {
        const userRef = ref(database, `users/${uid}`);
        const currentData = await get(userRef);
        await set(userRef, {
            ...currentData.val(),
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
