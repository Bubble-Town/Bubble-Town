// Chat Manager Module
import { database, ref, push, onValue, onChildAdded, get, query, limitToLast, orderByChild, equalTo } from './firebase-config.js';
import { getCurrentUser, getUserData } from './auth.js';

class ChatManager {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.unreadCount = 0;
        this.isMinimized = false;
        this.messageTimeouts = new Map();
    }

    init(user) {
        this.currentUser = user;
        const userData = getUserData();
        
        // Hide chat for users under 18
        if (!userData?.isAdult && !userData?.isAdmin) {
            const chatWindow = document.getElementById('chatWindow');
            if (chatWindow) {
                chatWindow.style.display = 'none';
            }
            return; // Don't set up chat for minors
        }
        
        this.setupChat();
        this.listenToMessages();
        this.updateClock();
    }

    setupChat() {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendChat');
        const chatMinimize = document.getElementById('chatMinimize');
        const chatWindow = document.getElementById('chatWindow');
        const chatHeader = document.querySelector('.chat-header');

        // Send message on button click
        sendBtn?.addEventListener('click', () => this.sendMessage());

        // Send message on Enter key
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Minimize/restore chat
        const toggleMinimize = () => {
            this.isMinimized = !this.isMinimized;
            chatWindow.classList.toggle('minimized', this.isMinimized);
            
            if (!this.isMinimized) {
                this.unreadCount = 0;
                this.updateUnreadBadge();
                this.scrollToBottom();
            }
        };

        chatMinimize?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMinimize();
        });

        chatHeader?.addEventListener('click', () => {
            if (this.isMinimized) {
                toggleMinimize();
            }
        });
    }

    listenToMessages() {
        const messagesRef = query(
            ref(database, 'chat/messages'),
            limitToLast(50)
        );

        onChildAdded(messagesRef, (snapshot) => {
            const message = snapshot.val();
            this.addMessage(message);
        });
    }

    // Profanity filter - basic word list
    filterProfanity(text) {
        const badWords = ['fuck', 'shit', 'damn', 'bitch', 'ass', 'crap', 'hell', 'piss', 'cock', 'dick', 'pussy', 'slut', 'whore', 'retard', 'nigger', 'fag'];
        let filtered = text;
        badWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        });
        return filtered;
    }

    // Check if text contains links
    containsLink(text) {
        const urlPattern = /(https?:\/\/|www\.)[^\s]+/gi;
        return urlPattern.test(text);
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        let text = input.value.trim();

        if (!text || !this.currentUser) return;
        
        // Check if user is adult (under 18 cannot chat)
        const userData = getUserData();
        if (!userData?.isAdult && !userData?.isAdmin) {
            alert('Chat is only available for users 18 and older');
            return;
        }

        // Block links
        if (this.containsLink(text)) {
            alert('Links are not allowed in chat');
            return;
        }

        // Filter profanity
        text = this.filterProfanity(text);

        const message = {
            text: text,
            senderId: this.currentUser.uid,
            senderName: this.currentUser.displayName || 'User',
            senderColor: userData?.color || 'aqua',
            timestamp: Date.now()
        };

        // Push to database
        push(ref(database, 'chat/messages'), message);

        // Show speech bubble above avatar
        this.showSpeechBubble(message);

        // Clear input
        input.value = '';
    }

    addMessage(message) {
        const isOwn = message.senderId === this.currentUser?.uid;
        
        // Add to chat history
        this.addToHistory(message, isOwn);

        // Show speech bubble (for others' messages only, own is shown immediately)
        if (!isOwn) {
            this.showSpeechBubble(message);
            
            // Increment unread if minimized
            if (this.isMinimized) {
                this.unreadCount++;
                this.updateUnreadBadge();
            }
        }
    }

    addToHistory(message, isOwn) {
        const chatHistory = document.getElementById('chatHistory');
        
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${isOwn ? 'own' : 'other'}`;
        messageEl.dataset.messageId = message.timestamp;
        messageEl.dataset.senderId = message.senderId;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div class="sender">${isOwn ? 'You' : message.senderName}</div>
            <div class="text">${this.escapeHtml(message.text)}</div>
            <div class="time">${time}</div>
            ${!isOwn ? `<button class="report-btn" title="Report harassment">⚠️</button>` : ''}
        `;
        
        // Add report functionality
        const reportBtn = messageEl.querySelector('.report-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.reportMessage(message);
            });
        }

        chatHistory.appendChild(messageEl);
        
        // Keep only last 50 messages in DOM
        while (chatHistory.children.length > 50) {
            chatHistory.removeChild(chatHistory.firstChild);
        }

        // Auto-scroll if not minimized
        if (!this.isMinimized) {
            this.scrollToBottom();
        }
    }

    showSpeechBubble(message) {
        const container = document.getElementById('speechBubbles');
        const isOwn = message.senderId === this.currentUser?.uid;
        
        // Find avatar position (simplified - center for now)
        // In a real implementation, you'd get the avatar's actual position
        const avatarEl = document.querySelector(`.world-avatar[data-uid="${message.senderId}"]`);
        
        const bubble = document.createElement('div');
        bubble.className = `speech-bubble ${isOwn ? 'own-message' : ''}`;
        bubble.textContent = message.text;
        
        if (avatarEl) {
            // Position above avatar
            const rect = avatarEl.getBoundingClientRect();
            const worldRect = document.getElementById('isometricWorld').getBoundingClientRect();
            
            const left = ((rect.left - worldRect.left) / worldRect.width) * 100;
            const top = ((rect.top - worldRect.top) / worldRect.height) * 100;
            
            bubble.style.left = `${left}%`;
            bubble.style.top = `${top - 10}%`;
        } else {
            // Default position if avatar not found
            bubble.style.left = '50%';
            bubble.style.top = '50%';
        }

        container.appendChild(bubble);

        // Remove after animation
        setTimeout(() => {
            bubble.remove();
        }, 5000);
    }

    scrollToBottom() {
        const chatHistory = document.getElementById('chatHistory');
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    updateUnreadBadge() {
        const chatWindow = document.getElementById('chatWindow');
        let badge = chatWindow.querySelector('.chat-unread');

        if (this.unreadCount > 0) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'chat-unread';
                chatWindow.querySelector('.xp-title-bar').appendChild(badge);
            }
            badge.textContent = this.unreadCount;
        } else if (badge) {
            badge.remove();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateClock() {
        const clock = document.getElementById('clock');
        
        const update = () => {
            const now = new Date();
            clock.textContent = now.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit'
            });
        };

        update();
        setInterval(update, 1000);
    }

    // Add system message
    addSystemMessage(text) {
        const chatHistory = document.getElementById('chatHistory');
        
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message system';
        messageEl.textContent = text;
        
        chatHistory.appendChild(messageEl);
        this.scrollToBottom();
    }

    // Report a message for harassment
    async reportMessage(message) {
        const reason = prompt('Why are you reporting this message? (harassment, spam, inappropriate content, etc.)');
        if (!reason) return;

        try {
            const reportData = {
                reportedMessage: message.text,
                reportedUserId: message.senderId,
                reportedUserName: message.senderName,
                reporterId: this.currentUser?.uid,
                reporterName: this.currentUser?.displayName,
                reason: reason,
                timestamp: Date.now(),
                status: 'pending'
            };
            
            await push(ref(database, 'reports'), reportData);
            alert('Report submitted. Thank you for helping keep our community safe.');
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Failed to submit report. Please try again.');
        }
    }

    // Admin: Get all pending reports
    async getPendingReports() {
        const reportsRef = ref(database, 'reports');
        const snapshot = await get(query(reportsRef, orderByChild('status'), equalTo('pending')));
        return snapshot.val() || {};
    }

    // Admin: Mark report as resolved
    async resolveReport(reportId, action) {
        const reportRef = ref(database, `reports/${reportId}`);
        await set(reportRef, {
            ...await get(reportRef).then(s => s.val()),
            status: 'resolved',
            action: action,
            resolvedAt: Date.now(),
            resolvedBy: this.currentUser?.uid
        });
    }
}

// Create global instance
const chatManager = new ChatManager();
window.chatManager = chatManager;

export default chatManager;