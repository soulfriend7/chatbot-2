class ChatBot {
    constructor() {
        this.socket = io();
        this.sessionId = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeChat();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.clearBtn = document.getElementById('clearChat');
        this.embeddingBtn = document.getElementById('embeddingBtn');
        this.embeddingModal = document.getElementById('embeddingModal');
        this.embeddingText = document.getElementById('embeddingText');
        this.createEmbeddingBtn = document.getElementById('createEmbedding');
        this.embeddingResult = document.getElementById('embeddingResult');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.closeModal = document.querySelector('.close');
    }

    setupEventListeners() {
        // Отправка сообщения
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Автоматическое изменение размера textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });

        // Голосовой ввод
        this.voiceBtn.addEventListener('click', () => this.toggleRecording());

        // Очистка чата
        this.clearBtn.addEventListener('click', () => this.clearChat());

        // Эмбеддинги
        this.embeddingBtn.addEventListener('click', () => this.openEmbeddingModal());
        this.createEmbeddingBtn.addEventListener('click', () => this.createEmbedding());
        this.closeModal.addEventListener('click', () => this.closeEmbeddingModal());

        // Закрытие модального окна по клику вне его
        window.addEventListener('click', (e) => {
            if (e.target === this.embeddingModal) {
                this.closeEmbeddingModal();
            }
        });

        // Socket события
        this.socket.on('chat_initialized', (data) => {
            this.sessionId = data.sessionId;
            console.log('Chat initialized with session:', this.sessionId);
        });

        this.socket.on('ai_response', (data) => {
            this.hideTypingIndicator();
            this.addMessage(data.message, 'ai');
            if (data.transcribedText) {
                this.addMessage(`🎤 Распознано: "${data.transcribedText}"`, 'system');
            }
        });

        this.socket.on('embedding_created', (data) => {
            this.showEmbeddingResult(data.embedding, data.text);
        });

        this.socket.on('chat_cleared', () => {
            this.clearChatUI();
        });

        this.socket.on('error', (data) => {
            this.showError(data.message);
        });
    }

    initializeChat() {
        this.socket.emit('init_chat');
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        
        this.showTypingIndicator();
        
        this.socket.emit('send_message', {
            message: message,
            sessionId: this.sessionId
        });
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (type === 'user') {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
        } else if (type === 'ai') {
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
        } else if (type === 'system') {
            avatar.innerHTML = '<i class="fas fa-info-circle"></i>';
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<p>${this.formatMessage(content)}</p>`;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Простое форматирование для markdown-подобного текста
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.sendAudioMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.voiceBtn.classList.add('recording');
            this.recordingIndicator.classList.add('show');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Не удалось получить доступ к микрофону');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.voiceBtn.classList.remove('recording');
            this.recordingIndicator.classList.remove('show');
        }
    }

    sendAudioMessage(audioBlob) {
        const reader = new FileReader();
        reader.onload = () => {
            const audioData = reader.result.split(',')[1]; // Убираем data:audio/wav;base64,
            
            this.addMessage('🎤 Голосовое сообщение отправлено', 'user');
            this.showTypingIndicator();
            
            this.socket.emit('send_audio', {
                audioData: audioData,
                sessionId: this.sessionId
            });
        };
        reader.readAsDataURL(audioBlob);
    }

    clearChat() {
        this.socket.emit('clear_chat', this.sessionId);
    }

    clearChatUI() {
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="message ai-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>Чат очищен. Чем могу помочь?</p>
                    </div>
                </div>
            </div>
        `;
    }

    openEmbeddingModal() {
        this.embeddingModal.style.display = 'block';
        this.embeddingText.focus();
    }

    closeEmbeddingModal() {
        this.embeddingModal.style.display = 'none';
        this.embeddingText.value = '';
        this.embeddingResult.innerHTML = '';
    }

    createEmbedding() {
        const text = this.embeddingText.value.trim();
        if (!text) {
            this.showError('Введите текст для создания эмбеддинга');
            return;
        }

        this.socket.emit('create_embedding', { text: text });
        this.createEmbeddingBtn.textContent = 'Создание...';
        this.createEmbeddingBtn.disabled = true;
    }

    showEmbeddingResult(embedding, text) {
        this.embeddingResult.innerHTML = `
            <h4>Эмбеддинг для текста: "${text}"</h4>
            <p><strong>Размерность:</strong> ${embedding.length}</p>
            <p><strong>Первые 10 значений:</strong></p>
            <code>${embedding.slice(0, 10).map(v => v.toFixed(6)).join(', ')}...</code>
            <p><strong>Полный эмбеддинг:</strong></p>
            <textarea readonly rows="10" style="width: 100%; font-family: monospace; font-size: 0.8rem;">${JSON.stringify(embedding, null, 2)}</textarea>
        `;
        
        this.createEmbeddingBtn.textContent = 'Создать эмбеддинг';
        this.createEmbeddingBtn.disabled = false;
    }

    showError(message) {
        this.addMessage(`❌ Ошибка: ${message}`, 'system');
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Инициализация чат-бота при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// Обработка необработанных промисов
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});
