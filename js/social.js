// Social Features Module - Friends, Private Messages, Emotes
import { database, ref, push, onValue, onChildAdded, get, set, remove, query, orderByChild, equalTo } from './firebase-config.js';
import { getCurrentUser, getUserData } from './auth.js';

class SocialManager {
    constructor() {
        this.currentUser = null;
        this.friends = [];
        this.friendRequests = [];
        this.blockedUsers = [];
        this.currentPmPartner = null;
        this.emoteTimeout = null;
    }

    init(user) {
        this.currentUser = user;
        const userData = getUserData();
        
        // Only adults get social features
        if (!userData?.isAdult && !userData?.isAdmin) {
            return; // Minors don't get social features
        }
        
        this.setupFriendsPanel();
        this.setupPmPanel();
        this.setupEmotes();
        this.listenToFriends();
        this.listenToFriendRequests();
        this.listenToPrivateMessages();
        this.updateTaskbar();
    }

    // Friends Panel Setup
    setupFriendsPanel() {
        // Open friends panel
        document.getElementById('openFriends')?.addEventListener('click', () => {
            document.getElementById('friendsPanel').classList.remove('hidden');
        });

        // Close friends panel
        document.getElementById('friendsClose')?.addEventListener('click', () => {
            document.getElementById('friendsPanel').classList.add('hidden');
        });

        // Tab switching
        document.querySelectorAll('.friends-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.friends-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.friends-tab-content').forEach(c => c.classList.add('hidden'));
                const targetTab = tab.dataset.tab;
                if (targetTab === 'friends') {
                    document.getElementById('friendsListTab').classList.remove('hidden');
                } else if (targetTab === 'requests') {
                    document.getElementById('requestsTab').classList.remove('hidden');
                } else if (targetTab === 'add') {
                    document.getElementById('addFriendTab').classList.remove('hidden');
                }
            });
        });

        // Search for friends
        document.getElementById('searchFriendBtn')?.addEventListener('click', () => {
            this.searchForFriend();
        });
    }

    async searchForFriend() {
        const searchInput = document.getElementById('friendSearchInput');
        const username = searchInput.value.trim();
        
        if (!username || !this.currentUser) return;
        
        // Search by display name
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        const results = [];
        snapshot.forEach(child => {
            const userData = child.val();
            const displayName = userData.displayName || '';
            if (displayName.toLowerCase().includes(username.toLowerCase()) && 
                child.key !== this.currentUser.uid &&
                !this.friends.includes(child.key) &&
                !this.blockedUsers.includes(child.key)) {
                results.push({ uid: child.key, ...userData });
            }
        });
        
        this.displaySearchResults(results);
    }

    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        
        if (results.length === 0) {
            container.innerHTML = '<p class="no-results">No users found</p>';
            return;
        }
        
        container.innerHTML = results.map(user => `
            <div class="search-result-item">
                <div class="user-info">
                    <div class="msn-avatar small" style="background: ${this.getColorHex(user.color)}"></div>
                    <span>${user.displayName || 'User'}</span>
                </div>
                <button class="xp-button-small add-friend-btn" data-uid="${user.uid}">Add Friend</button>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.add-friend-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.sendFriendRequest(btn.dataset.uid);
                btn.textContent = 'Request Sent';
                btn.disabled = true;
            });
        });
    }

    getColorHex(color) {
        const colors = {
            aqua: '#00CED1',
            sky: '#87CEEB',
            mint: '#98FF98',
            lemon: '#FFFACD',
            pink: '#FFB6C1',
            lavender: '#E6E6FA'
        };
        return colors[color] || colors.aqua;
    }

    async sendFriendRequest(targetUid) {
        if (!this.currentUser) return;
        
        const requestData = {
            from: this.currentUser.uid,
            fromName: this.currentUser.displayName,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        await set(ref(database, `friendRequests/${targetUid}/${this.currentUser.uid}`), requestData);
    }

    listenToFriends() {
        if (!this.currentUser) return;
        
        const friendsRef = ref(database, `friends/${this.currentUser.uid}`);
        onValue(friendsRef, (snapshot) => {
            this.friends = [];
            const friendsList = document.getElementById('friendsList');
            
            if (!snapshot.exists()) {
                friendsList.innerHTML = '<p class="no-friends">No friends yet. Send a friend request!</p>';
                return;
            }
            
            snapshot.forEach(child => {
                this.friends.push(child.key);
            });
            
            this.updateFriendsList();
        });
    }

    async updateFriendsList() {
        const friendsList = document.getElementById('friendsList');
        
        if (this.friends.length === 0) {
            friendsList.innerHTML = '<p class="no-friends">No friends yet. Send a friend request!</p>';
            return;
        }
        
        // Get friend details
        const friendDetails = [];
        for (const uid of this.friends) {
            const userRef = ref(database, `users/${uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                friendDetails.push({ uid, ...snapshot.val() });
            }
        }
        
        friendsList.innerHTML = friendDetails.map(friend => `
            <div class="friend-item">
                <div class="friend-info" data-uid="${friend.uid}">
                    <div class="msn-avatar small" style="background: ${this.getColorHex(friend.color)}"></div>
                    <span>${friend.displayName || 'User'}</span>
                    ${friend.isOnline ? '<span class="online-indicator">●</span>' : ''}
                </div>
                <div class="friend-actions">
                    <button class="xp-button-small pm-btn" data-uid="${friend.uid}" data-name="${friend.displayName}">Message</button>
                    <button class="xp-button-small remove-btn" data-uid="${friend.uid}">Remove</button>
                </div>
            </div>
        `).join('');
        
        // Add handlers
        friendsList.querySelectorAll('.pm-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openPrivateMessage(btn.dataset.uid, btn.dataset.name);
            });
        });
        
        friendsList.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeFriend(btn.dataset.uid);
            });
        });
    }

    listenToFriendRequests() {
        if (!this.currentUser) return;
        
        const requestsRef = ref(database, `friendRequests/${this.currentUser.uid}`);
        onValue(requestsRef, (snapshot) => {
            this.friendRequests = [];
            const requestsList = document.getElementById('friendRequestsList');
            
            if (!snapshot.exists()) {
                requestsList.innerHTML = '<p class="no-requests">No pending requests</p>';
                return;
            }
            
            snapshot.forEach(child => {
                if (child.val().status === 'pending') {
                    this.friendRequests.push({ uid: child.key, ...child.val() });
                }
            });
            
            if (this.friendRequests.length === 0) {
                requestsList.innerHTML = '<p class="no-requests">No pending requests</p>';
                return;
            }
            
            requestsList.innerHTML = this.friendRequests.map(req => `
                <div class="request-item">
                    <span>${req.fromName} wants to be friends</span>
                    <div class="request-actions">
                        <button class="xp-button-small accept-btn" data-uid="${req.uid}">Accept</button>
                        <button class="xp-button-small decline-btn" data-uid="${req.uid}">Decline</button>
                    </div>
                </div>
            `).join('');
            
            requestsList.querySelectorAll('.accept-btn').forEach(btn => {
                btn.addEventListener('click', () => this.acceptFriendRequest(btn.dataset.uid));
            });
            
            requestsList.querySelectorAll('.decline-btn').forEach(btn => {
                btn.addEventListener('click', () => this.declineFriendRequest(btn.dataset.uid));
            });
        });
    }

    async acceptFriendRequest(fromUid) {
        if (!this.currentUser) return;
        
        // Add to both users' friends lists
        await set(ref(database, `friends/${this.currentUser.uid}/${fromUid}`), { since: Date.now() });
        await set(ref(database, `friends/${fromUid}/${this.currentUser.uid}`), { since: Date.now() });
        
        // Remove request
        await remove(ref(database, `friendRequests/${this.currentUser.uid}/${fromUid}`));
    }

    async declineFriendRequest(fromUid) {
        if (!this.currentUser) return;
        await remove(ref(database, `friendRequests/${this.currentUser.uid}/${fromUid}`));
    }

    async removeFriend(uid) {
        if (!this.currentUser) return;
        
        await remove(ref(database, `friends/${this.currentUser.uid}/${uid}`));
        await remove(ref(database, `friends/${uid}/${this.currentUser.uid}`));
    }

    // Private Messages
    setupPmPanel() {
        document.getElementById('pmClose')?.addEventListener('click', () => {
            document.getElementById('pmPanel').classList.add('hidden');
            this.currentPmPartner = null;
        });

        document.getElementById('sendPmBtn')?.addEventListener('click', () => {
            this.sendPrivateMessage();
        });

        document.getElementById('pmInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendPrivateMessage();
        });
    }

    openPrivateMessage(uid, name) {
        this.currentPmPartner = { uid, name };
        document.getElementById('pmPanel').classList.remove('hidden');
        document.getElementById('pmChatHeader').innerHTML = `
            <div class="chat-partner">
                <span>Chat with ${name}</span>
            </div>
        `;
        
        // Load conversation
        this.loadPrivateMessages(uid);
    }

    async loadPrivateMessages(partnerUid) {
        const conversationId = this.getConversationId(this.currentUser.uid, partnerUid);
        const messagesRef = ref(database, `privateMessages/${conversationId}`);
        
        onValue(messagesRef, (snapshot) => {
            const container = document.getElementById('pmMessages');
            container.innerHTML = '';
            
            if (!snapshot.exists()) {
                container.innerHTML = '<p class="no-messages">Start a conversation!</p>';
                return;
            }
            
            snapshot.forEach(child => {
                const msg = child.val();
                const isOwn = msg.senderId === this.currentUser.uid;
                
                const msgEl = document.createElement('div');
                msgEl.className = `pm-message ${isOwn ? 'own' : 'other'}`;
                msgEl.innerHTML = `
                    <div class="pm-text">${this.escapeHtml(msg.text)}</div>
                    <div class="pm-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                `;
                container.appendChild(msgEl);
            });
            
            container.scrollTop = container.scrollHeight;
        });
    }

    async sendPrivateMessage() {
        const input = document.getElementById('pmInput');
        let text = input.value.trim();
        
        if (!text || !this.currentPmPartner || !this.currentUser) return;
        
        // Filter profanity
        text = this.filterProfanity(text);
        
        // Block links
        if (this.containsLink(text)) {
            alert('Links are not allowed in messages');
            return;
        }
        
        const conversationId = this.getConversationId(this.currentUser.uid, this.currentPmPartner.uid);
        
        const message = {
            text: text,
            senderId: this.currentUser.uid,
            senderName: this.currentUser.displayName,
            timestamp: Date.now()
        };
        
        await push(ref(database, `privateMessages/${conversationId}`), message);
        input.value = '';
    }

    getConversationId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    listenToPrivateMessages() {
        // Update conversations list
        if (!this.currentUser) return;
        
        const conversationsRef = ref(database, 'privateMessages');
        onValue(conversationsRef, (snapshot) => {
            const conversations = [];
            
            snapshot.forEach(child => {
                const conversationId = child.key;
                if (conversationId.includes(this.currentUser.uid)) {
                    const partnerUid = conversationId.replace(this.currentUser.uid, '').replace('_', '');
                    conversations.push({ uid: partnerUid, ...child.val() });
                }
            });
            
            this.updateConversationsList(conversations);
        });
    }

    async updateConversationsList(conversations) {
        const container = document.getElementById('pmConversationsList');
        
        if (conversations.length === 0) {
            container.innerHTML = '<p class="no-conversations">No conversations yet</p>';
            return;
        }
        
        // Get partner names
        const items = [];
        for (const conv of conversations) {
            const userRef = ref(database, `users/${conv.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                items.push({
                    uid: conv.uid,
                    name: userData.displayName || 'User',
                    color: userData.color || 'aqua'
                });
            }
        }
        
        container.innerHTML = items.map(item => `
            <div class="conversation-item" data-uid="${item.uid}" data-name="${item.name}">
                <div class="msn-avatar tiny" style="background: ${this.getColorHex(item.color)}"></div>
                <span>${item.name}</span>
            </div>
        `).join('');
        
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openPrivateMessage(item.dataset.uid, item.dataset.name);
            });
        });
    }

    // Emotes
    setupEmotes() {
        // Add emotes button to taskbar
        this.updateTaskbar();
        
        // Toggle emotes menu
        document.getElementById('toggleEmotes')?.addEventListener('click', () => {
            const menu = document.getElementById('emotesMenu');
            menu.classList.toggle('hidden');
        });
        
        // Emote selection
        document.querySelectorAll('.emote-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playEmote(btn.dataset.emote);
                document.getElementById('emotesMenu').classList.add('hidden');
            });
        });
    }

    playEmote(emoteType) {
        if (!this.currentUser) return;
        
        const emotes = {
            wave: '👋',
            heart: '❤️',
            laugh: '😄',
            sad: '😢',
            dance: '💃',
            sleep: '😴',
            music: '🎵',
            sparkle: '✨'
        };
        
        const emoteChar = emotes[emoteType] || '✨';
        
        // Show emote above avatar
        const avatarEl = document.querySelector(`.world-avatar[data-uid="${this.currentUser.uid}"]`);
        if (avatarEl) {
            const emoteBubble = document.createElement('div');
            emoteBubble.className = 'emote-bubble';
            emoteBubble.textContent = emoteChar;
            
            const rect = avatarEl.getBoundingClientRect();
            emoteBubble.style.left = `${rect.left + rect.width / 2}px`;
            emoteBubble.style.top = `${rect.top - 40}px`;
            
            document.body.appendChild(emoteBubble);
            
            // Animate
            emoteBubble.animate([
                { transform: 'translateY(0) scale(0.5)', opacity: 0 },
                { transform: 'translateY(-20px) scale(1.2)', opacity: 1, offset: 0.3 },
                { transform: 'translateY(-40px) scale(1)', opacity: 1, offset: 0.7 },
                { transform: 'translateY(-60px) scale(0.8)', opacity: 0 }
            ], {
                duration: 2000,
                easing: 'ease-out'
            }).onfinish = () => emoteBubble.remove();
        }
        
        // Broadcast to others
        push(ref(database, 'emotes'), {
            userId: this.currentUser.uid,
            emote: emoteType,
            timestamp: Date.now()
        });
    }

    updateTaskbar() {
        const taskbar = document.querySelector('.xp-taskbar-items');
        if (!taskbar) return;
        
        // Add social buttons
        const socialItems = document.createElement('div');
        socialItems.className = 'social-taskbar-items';
        socialItems.innerHTML = `
            <div class="taskbar-item" id="openFriends" title="Friends">
                <span>👥</span> Friends
            </div>
            <div class="taskbar-item" id="openPMs" title="Messages">
                <span>💌</span> Messages
            </div>
            <div class="taskbar-item" id="toggleEmotes" title="Emotes">
                <span>😊</span> Emotes
            </div>
        `;
        
        taskbar.appendChild(socialItems);
        
        // Add PM button handler
        document.getElementById('openPMs')?.addEventListener('click', () => {
            document.getElementById('pmPanel').classList.remove('hidden');
        });
    }

    // Utils
    filterProfanity(text) {
        const badWords = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'crap', 'hell', 'piss', 'cock', 'dick', 'pussy', 'slut', 'whore', 'retard', 'nigger', 'fag'];
        let filtered = text;
        badWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        });
        return filtered;
    }

    containsLink(text) {
        const urlPattern = /(https?:\/\/|www\.)[^\s]+/gi;
        return urlPattern.test(text);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const socialManager = new SocialManager();
window.socialManager = socialManager;

export default socialManager;
