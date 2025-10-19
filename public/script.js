class BankAssistant {
    constructor() {
        this.socket = io();
        this.sessionId = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.userProfile = {
            income: 0,
            expenses: [],
            goals: [],
            riskTolerance: 'conservative'
        };
        this.charts = {};
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeChat();
        this.loadSampleData();
    }

    initializeElements() {
        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.clearBtn = document.getElementById('clearChat');
        
        // Sidebar elements
        this.goalsList = document.getElementById('goalsList');
        this.expensesChart = document.getElementById('expensesPieChart');
        
        // Modal elements
        this.profileModal = document.getElementById('profileModal');
        this.goalModal = document.getElementById('goalModal');
        this.analyticsModal = document.getElementById('analyticsModal');
        
        // Profile elements
        this.monthlyIncome = document.getElementById('monthlyIncome');
        this.monthlyExpenses = document.getElementById('monthlyExpenses');
        this.riskTolerance = document.getElementById('riskTolerance');
        this.saveProfile = document.getElementById('saveProfile');
        
        // Goal elements
        this.goalName = document.getElementById('goalName');
        this.goalCost = document.getElementById('goalCost');
        this.goalTimeline = document.getElementById('goalTimeline');
        this.currentSavings = document.getElementById('currentSavings');
        this.saveGoal = document.getElementById('saveGoal');
        
        // Other elements
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.closeModal = document.querySelectorAll('.close');
    }

    setupEventListeners() {
        // Chat functionality
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });

        this.voiceBtn.addEventListener('click', () => this.toggleRecording());
        this.clearBtn.addEventListener('click', () => this.clearChat());

        // Modal functionality
        document.getElementById('profileBtn').addEventListener('click', () => this.openModal('profileModal'));
        document.getElementById('goalsBtn').addEventListener('click', () => this.openModal('goalModal'));
        document.getElementById('analyticsBtn').addEventListener('click', () => this.openModal('analyticsModal'));
        document.getElementById('addGoalBtn').addEventListener('click', () => this.openModal('goalModal'));

        // Close modals
        this.closeModal.forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

        // Save profile
        this.saveProfile.addEventListener('click', () => this.saveUserProfile());
        this.saveGoal.addEventListener('click', () => this.addFinancialGoal());

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Socket events
        this.socket.on('chat_initialized', (data) => {
            this.sessionId = data.sessionId;
            console.log('Bank chat initialized with session:', this.sessionId);
        });

        this.socket.on('ai_response', (data) => {
            this.hideTypingIndicator();
            this.addMessage(data.message, 'ai');
            if (data.transcribedText) {
                this.addMessage(`🎤 Распознано: "${data.transcribedText}"`, 'system');
            }
        });

        this.socket.on('goal_analysis', (data) => {
            this.displayGoalAnalysis(data.analysis);
        });

        this.socket.on('expense_analysis', (data) => {
            this.displayExpenseAnalysis(data.analysis);
        });

        this.socket.on('product_recommendations', (data) => {
            this.displayProductRecommendations(data.recommendations);
        });

        this.socket.on('product_search_results', (data) => {
            this.displayProductSearchResults(data.results, data.query);
        });

        this.socket.on('product_details', (data) => {
            this.displayProductDetails(data.product);
        });

        this.socket.on('product_categories', (data) => {
            this.displayProductCategories(data.categories, data.stats);
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
            sessionId: this.sessionId,
            context: 'financial_planning'
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
            avatar.innerHTML = '<i class="fas fa-mosque"></i>';
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
                <i class="fas fa-mosque"></i>
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
            const audioData = reader.result.split(',')[1];
            
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
                        <i class="fas fa-mosque"></i>
                    </div>
                    <div class="message-content">
                        <h3>Ас-саляму алейкум! 👋</h3>
                        <p>Чат очищен. Чем могу помочь с вашими финансами?</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Modal functions
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'block';
        
        if (modalId === 'analyticsModal') {
            this.updateAnalytics();
        }
    }

    // Profile functions
    saveUserProfile() {
        this.userProfile = {
            income: parseInt(this.monthlyIncome.value) || 0,
            expenses: this.userProfile.expenses,
            goals: this.userProfile.goals,
            riskTolerance: this.riskTolerance.value
        };

        this.socket.emit('update_profile', {
            profile: this.userProfile,
            sessionId: this.sessionId
        });

        this.profileModal.style.display = 'none';
        this.addMessage('✅ Профиль обновлен! Теперь я могу давать более точные рекомендации.', 'system');
    }

    // Goal functions
    addFinancialGoal() {
        const goal = {
            name: this.goalName.value,
            cost: parseInt(this.goalCost.value) || 0,
            timeline: parseInt(this.goalTimeline.value) || 12,
            currentSavings: parseInt(this.currentSavings.value) || 0,
            type: this.goalName.value.toLowerCase()
        };

        this.userProfile.goals.push(goal);
        this.updateGoalsList();
        
        this.socket.emit('analyze_goal', {
            goal: goal,
            sessionId: this.sessionId
        });

        this.goalModal.style.display = 'none';
        this.clearGoalForm();
    }

    clearGoalForm() {
        this.goalName.value = '';
        this.goalCost.value = '';
        this.goalTimeline.value = '';
        this.currentSavings.value = '';
    }

    updateGoalsList() {
        this.goalsList.innerHTML = '';
        
        this.userProfile.goals.forEach(goal => {
            const progress = Math.min((goal.currentSavings / goal.cost) * 100, 100);
            
            const goalItem = document.createElement('div');
            goalItem.className = 'goal-item';
            goalItem.innerHTML = `
                <div class="goal-icon">${this.getGoalIcon(goal.type)}</div>
                <div class="goal-info">
                    <div class="goal-name">${goal.name}</div>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress.toFixed(1)}%</span>
                    </div>
                </div>
            `;
            
            this.goalsList.appendChild(goalItem);
        });
    }

    getGoalIcon(goalType) {
        const icons = {
            'квартира': '🏠',
            'дом': '🏡',
            'автомобиль': '🚗',
            'образование': '🎓',
            'путешествие': '✈️',
            'свадьба': '💒',
            'операция': '🏥'
        };
        return icons[goalType] || '🎯';
    }

    displayGoalAnalysis(analysis) {
        const message = `
            <h4>📊 Анализ финансовой цели</h4>
            <p><strong>Стоимость цели:</strong> ${analysis.goalCost.toLocaleString()} тенге</p>
            <p><strong>Ежемесячные сбережения:</strong> ${analysis.monthlySavings.toLocaleString()} тенге</p>
            <p><strong>Время достижения:</strong> ${analysis.requiredTime} месяцев</p>
            <p><strong>Реалистичность:</strong> ${analysis.isAchievable ? '✅ Достижимо' : '⚠️ Требует корректировки'}</p>
            <h5>Рекомендации:</h5>
            <ul>
                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        `;
        
        this.addMessage(message, 'ai');
    }

    displayExpenseAnalysis(analysis) {
        const message = `
            <h4>💰 Анализ расходов</h4>
            <p><strong>Общие расходы:</strong> ${analysis.totalExpenses.toLocaleString()} тенге</p>
            <p><strong>Основная категория:</strong> ${analysis.topCategory}</p>
            <h5>Рекомендации по оптимизации:</h5>
            <ul>
                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        `;
        
        this.addMessage(message, 'ai');
    }

    displayProductRecommendations(recommendations) {
        if (recommendations.length === 0) {
            this.addMessage('На данный момент нет подходящих продуктов. Обновите профиль для получения рекомендаций.', 'ai');
            return;
        }

        let message = '<h4>🏦 Рекомендуемые продукты</h4>';
        
        recommendations.forEach(rec => {
            const islamicBadge = rec.islamic ? '<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">Халяль</span>' : '';
            message += `
                <div style="background: #f8f9fa; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; border-left: 4px solid #1e3c72;">
                    <h5>${rec.name} ${islamicBadge}</h5>
                    <p><strong>Категория:</strong> ${rec.category}</p>
                    <p><strong>Описание:</strong> ${rec.description}</p>
                    <p><strong>Ставка:</strong> ${rec.rate}% годовых</p>
                    <p><strong>Сумма:</strong> от ${rec.minAmount.toLocaleString()} до ${rec.maxAmount.toLocaleString()} ${rec.currency}</p>
                    <p><strong>Срок:</strong> ${rec.term} месяцев</p>
                    ${rec.conditions ? `<p><strong>Условия:</strong> ${rec.conditions}</p>` : ''}
                    ${rec.benefits ? `<p><strong>Преимущества:</strong> ${rec.benefits}</p>` : ''}
                </div>
            `;
        });
        
        this.addMessage(message, 'ai');
    }

    displayProductSearchResults(results, query) {
        if (results.length === 0) {
            this.addMessage(`По запросу "${query}" ничего не найдено. Попробуйте изменить поисковый запрос.`, 'ai');
            return;
        }

        let message = `<h4>🔍 Результаты поиска: "${query}"</h4>`;
        message += `<p>Найдено ${results.length} продуктов:</p>`;
        
        results.forEach(product => {
            const islamicBadge = product.islamic ? '<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">Халяль</span>' : '';
            message += `
                <div style="background: #f8f9fa; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; border-left: 4px solid #1e3c72;">
                    <h5>${product.name} ${islamicBadge}</h5>
                    <p><strong>Категория:</strong> ${product.category}</p>
                    <p><strong>Описание:</strong> ${product.description}</p>
                    <p><strong>Ставка:</strong> ${product.rate}% годовых</p>
                    <p><strong>Сумма:</strong> от ${product.minAmount.toLocaleString()} до ${product.maxAmount.toLocaleString()} ${product.currency}</p>
                    <p><strong>Срок:</strong> ${product.term} месяцев</p>
                </div>
            `;
        });
        
        this.addMessage(message, 'ai');
    }

    displayProductDetails(product) {
        const islamicBadge = product.islamic ? '<span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.9rem;">Халяль</span>' : '';
        let message = `
            <h4>📋 Детали продукта</h4>
            <div style="background: #f8f9fa; padding: 1.5rem; margin: 0.5rem 0; border-radius: 8px; border-left: 4px solid #1e3c72;">
                <h5>${product.name} ${islamicBadge}</h5>
                <p><strong>Категория:</strong> ${product.category}</p>
                <p><strong>Описание:</strong> ${product.description}</p>
                <p><strong>Валюта:</strong> ${product.currency}</p>
                <p><strong>Минимальная сумма:</strong> ${product.minAmount.toLocaleString()} ${product.currency}</p>
                <p><strong>Максимальная сумма:</strong> ${product.maxAmount.toLocaleString()} ${product.currency}</p>
                <p><strong>Ставка:</strong> ${product.rate}% годовых</p>
                <p><strong>Срок:</strong> ${product.term} месяцев</p>
        `;
        
        if (product.conditions) {
            message += `<p><strong>Условия:</strong> ${product.conditions}</p>`;
        }
        
        if (product.benefits) {
            message += `<p><strong>Преимущества:</strong> ${product.benefits}</p>`;
        }
        
        if (product.requirements) {
            message += `<p><strong>Требования:</strong> ${product.requirements}</p>`;
        }
        
        message += '</div>';
        
        this.addMessage(message, 'ai');
    }

    displayProductCategories(categories, stats) {
        let message = `
            <h4>📂 Категории продуктов</h4>
            <p><strong>Всего продуктов:</strong> ${stats.totalProducts}</p>
            <p><strong>Категорий:</strong> ${stats.categories}</p>
            <p><strong>Исламских продуктов:</strong> ${stats.islamicProducts}</p>
            <p><strong>Обычных продуктов:</strong> ${stats.regularProducts}</p>
            <h5>Доступные категории:</h5>
            <ul>
        `;
        
        categories.forEach(category => {
            message += `<li>${category}</li>`;
        });
        
        message += '</ul>';
        
        this.addMessage(message, 'ai');
    }

    // Analytics functions
    updateAnalytics() {
        this.createIncomeExpenseChart();
        this.createCategoryChart();
        this.createGoalsProgressChart();
        this.updateRecommendations();
    }

    createIncomeExpenseChart() {
        const ctx = document.getElementById('incomeExpenseChart').getContext('2d');
        
        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
        }
        
        this.charts.incomeExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Доходы', 'Расходы'],
                datasets: [{
                    label: 'Сумма (тенге)',
                    data: [this.userProfile.income, this.userProfile.monthlyExpenses || 0],
                    backgroundColor: ['#4CAF50', '#f44336'],
                    borderColor: ['#45a049', '#d32f2f'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Доходы vs Расходы'
                    }
                }
            }
        });
    }

    createCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        if (this.charts.category) {
            this.charts.category.destroy();
        }
        
        // Sample data - in real app, this would come from user's expense data
        const categoryData = {
            'Продукты питания': 50000,
            'Транспорт': 30000,
            'Жилье': 80000,
            'Развлечения': 20000,
            'Здоровье': 15000
        };
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Категории расходов'
                    }
                }
            }
        });
    }

    createGoalsProgressChart() {
        const ctx = document.getElementById('goalsProgressChart').getContext('2d');
        
        if (this.charts.goalsProgress) {
            this.charts.goalsProgress.destroy();
        }
        
        const goalNames = this.userProfile.goals.map(goal => goal.name);
        const goalProgress = this.userProfile.goals.map(goal => 
            Math.min((goal.currentSavings / goal.cost) * 100, 100)
        );
        
        this.charts.goalsProgress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: goalNames,
                datasets: [{
                    label: 'Прогресс (%)',
                    data: goalProgress,
                    backgroundColor: '#4CAF50',
                    borderColor: '#45a049',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Прогресс целей'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    updateRecommendations() {
        const recommendationsList = document.getElementById('recommendationsList');
        const recommendations = [
            'Создайте резервный фонд на 3-6 месяцев расходов',
            'Рассмотрите исламские депозиты для накоплений',
            'Автоматизируйте переводы на сбережения',
            'Отслеживайте все расходы в течение месяца',
            'Инвестируйте в образование для увеличения дохода'
        ];
        
        recommendationsList.innerHTML = recommendations.map(rec => 
            `<div class="recommendation-item">${rec}</div>`
        ).join('');
    }

    // Load sample data
    loadSampleData() {
        this.userProfile = {
            income: 500000,
            expenses: [
                { category: 'Продукты питания', amount: 50000 },
                { category: 'Транспорт', amount: 30000 },
                { category: 'Жилье', amount: 80000 },
                { category: 'Развлечения', amount: 20000 }
            ],
            goals: [
                { name: 'Квартира', cost: 15000000, currentSavings: 2000000, timeline: 60, type: 'квартира' },
                { name: 'Образование', cost: 2000000, currentSavings: 500000, timeline: 24, type: 'образование' }
            ],
            riskTolerance: 'moderate'
        };
        
        this.updateGoalsList();
    }

    showError(message) {
        this.addMessage(`❌ Ошибка: ${message}`, 'system');
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Инициализация банковского ассистента
document.addEventListener('DOMContentLoaded', () => {
    new BankAssistant();
});

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});
