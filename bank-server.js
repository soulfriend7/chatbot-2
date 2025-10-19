const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const config = require('./bank-config');
const ProductCatalog = require('./product-catalog');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Настройка multer для загрузки аудио файлов
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// OpenAI API клиент
class OpenAIClient {
  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.baseURL = config.OPENAI_BASE_URL;
  }

  async chatCompletion(messages, systemPrompt = null) {
    try {
      const requestMessages = systemPrompt ? 
        [{ role: 'system', content: systemPrompt }, ...messages] : 
        messages;

      const response = await axios.post(`${this.baseURL}/v1/chat/completions`, {
        model: config.MODELS.GPT,
        messages: requestMessages,
        max_tokens: 1500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Chat completion error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createEmbedding(text) {
    try {
      const response = await axios.post(`${this.baseURL}/v1/embeddings`, {
        model: config.MODELS.EMBEDDING,
        input: text
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Embedding error:', error.response?.data || error.message);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer) {
    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', config.MODELS.WHISPER);

      const response = await axios.post(`${this.baseURL}/v1/audio/transcriptions`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Transcription error:', error.response?.data || error.message);
      throw error;
    }
  }
}

const openaiClient = new OpenAIClient();

// Инициализация каталога продуктов
const productCatalog = new ProductCatalog();

// Хранилище сессий чата и пользовательских данных
const chatSessions = new Map();
const userProfiles = new Map();

// Системные промпты для банковского ассистента
const BANK_SYSTEM_PROMPTS = {
  FINANCIAL_ADVISOR: `Вы - AI-ассистент Zaman Bank, специализирующийся на исламских финансах. 
Ваша задача - помочь клиентам с финансовым планированием, целями и продуктами банка.

ВАЖНО: У вас есть доступ к полному справочнику продуктов банка. Всегда используйте актуальную информацию из справочника при рекомендации продуктов.

Доступные продукты:
${JSON.stringify(productCatalog.getAllProducts().slice(0, 10), null, 2)}

При ответах:
1. Используйте ТОЛЬКО продукты из справочника
2. Указывайте точные условия, ставки и требования
3. Объясняйте преимущества каждого продукта
4. Учитывайте исламские принципы для халяльных продуктов
5. Давайте персонализированные рекомендации на основе профиля клиента

Отвечайте на казахском или русском языке, будьте дружелюбны и профессиональны.`,

  GOAL_PLANNING: `Вы помогаете клиентам ставить и достигать финансовые цели.
Анализируйте их доходы, расходы и мечты, предлагайте реалистичные планы.

Используйте продукты из справочника:
${JSON.stringify(productCatalog.getAllProducts().filter(p => p.type.includes('Финансирование') || p.type.includes('Депозитный')), null, 2)}

При планировании целей:
1. Рекомендуйте конкретные продукты из справочника
2. Рассчитывайте реальные сроки и суммы
3. Учитывайте исламские принципы
4. Предлагайте пошаговый план достижения`,

  EXPENSE_ANALYSIS: `Вы анализируете финансовые привычки клиентов и даете советы по оптимизации.
Предлагайте способы экономии и увеличения доходов, учитывая исламские принципы.

Доступные продукты для сбережений:
${JSON.stringify(productCatalog.getAllProducts().filter(p => p.type.includes('Депозитный') || p.type.includes('Инвестиционный')), null, 2)}

При анализе:
1. Выявляйте проблемные зоны в расходах
2. Рекомендуйте подходящие депозиты из справочника
3. Предлагайте исламские альтернативы
4. Будьте тактичны и конструктивны`
};

// Банковские функции
class BankAssistant {
  constructor() {
    this.config = config;
  }

  // Анализ финансовых целей
  analyzeFinancialGoal(goal, income, expenses, timeline) {
    const goalCost = goal.cost || this.estimateGoalCost(goal.type);
    const monthlySavings = income - expenses;
    const requiredTime = Math.ceil(goalCost / monthlySavings);
    
    return {
      goalCost,
      monthlySavings,
      requiredTime,
      isAchievable: requiredTime <= timeline,
      recommendations: this.getGoalRecommendations(goal, monthlySavings, requiredTime)
    };
  }

  estimateGoalCost(goalType) {
    const estimates = {
      'квартира': 15000000,
      'дом': 25000000,
      'образование': 2000000,
      'операция': 500000,
      'путешествие': 1000000,
      'автомобиль': 3000000,
      'свадьба': 2000000
    };
    return estimates[goalType.toLowerCase()] || 1000000;
  }

  getGoalRecommendations(goal, monthlySavings, requiredTime) {
    const recommendations = [];
    
    if (monthlySavings < 50000) {
      recommendations.push('Рассмотрите способы увеличения дохода');
      recommendations.push('Проанализируйте расходы на предмет экономии');
    }
    
    if (requiredTime > 10) {
      recommendations.push('Рассмотрите инвестиционные продукты для ускорения накоплений');
      recommendations.push('Возможно, стоит пересмотреть размер цели');
    }
    
    recommendations.push('Откройте депозит "Халяль" для накоплений');
    recommendations.push('Настройте автоматические переводы на сбережения');
    
    return recommendations;
  }

  // Анализ расходов
  analyzeExpenses(expenses) {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categories = {};
    
    expenses.forEach(exp => {
      if (!categories[exp.category]) {
        categories[exp.category] = { amount: 0, count: 0 };
      }
      categories[exp.category].amount += exp.amount;
      categories[exp.category].count += 1;
    });
    
    const analysis = {
      totalExpenses,
      categories,
      topCategory: Object.keys(categories).reduce((a, b) => 
        categories[a].amount > categories[b].amount ? a : b
      ),
      recommendations: this.getExpenseRecommendations(categories, totalExpenses)
    };
    
    return analysis;
  }

  getExpenseRecommendations(categories, totalExpenses) {
    const recommendations = [];
    
    // Анализ по категориям
    Object.keys(categories).forEach(category => {
      const percentage = (categories[category].amount / totalExpenses) * 100;
      
      if (percentage > 40) {
        recommendations.push(`Слишком много трат на ${category} (${percentage.toFixed(1)}%)`);
      }
      
      if (category === 'Развлечения' && percentage > 20) {
        recommendations.push('Рассмотрите сокращение развлекательных расходов');
      }
    });
    
    return recommendations;
  }

  // Подбор банковских продуктов
  recommendProducts(userProfile, goals) {
    const recommendations = [];
    
    // Депозиты
    if (userProfile.monthlyIncome > 200000) {
      recommendations.push({
        type: 'deposit',
        product: config.BANK_PRODUCTS.DEPOSITS[0],
        reason: 'Для накопления на крупные цели'
      });
    }
    
    // Кредиты
    if (goals.some(goal => goal.type === 'квартира' || goal.type === 'дом')) {
      recommendations.push({
        type: 'mortgage',
        product: config.BANK_PRODUCTS.CREDITS[0],
        reason: 'Исламская ипотека для покупки жилья'
      });
    }
    
    // Инвестиции
    if (userProfile.riskTolerance === 'medium' && userProfile.monthlyIncome > 300000) {
      recommendations.push({
        type: 'investment',
        product: config.BANK_PRODUCTS.INVESTMENTS[0],
        reason: 'Для долгосрочного роста капитала'
      });
    }
    
    return recommendations;
  }

  // Генерация мотивационных сообщений
  getMotivationMessage(progress, goal) {
    const messages = config.MOTIVATION_MESSAGES;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    if (progress > 0.5) {
      return `Отлично! Вы уже прошли ${(progress * 100).toFixed(1)}% пути к цели "${goal.name}". ${randomMessage}`;
    } else if (progress > 0.2) {
      return `Хорошее начало! Вы на ${(progress * 100).toFixed(1)}% пути к цели "${goal.name}". Продолжайте в том же духе!`;
    } else {
      return `Каждый шаг важен! Вы только начинаете путь к цели "${goal.name}". ${randomMessage}`;
    }
  }
}

const bankAssistant = new BankAssistant();

// Socket.IO обработчики
io.on('connection', (socket) => {
  console.log('Bank client connected:', socket.id);
  
  // Инициализация сессии чата
  socket.on('init_chat', () => {
    const sessionId = socket.id;
    chatSessions.set(sessionId, []);
    userProfiles.set(sessionId, {
      income: 0,
      expenses: [],
      goals: [],
      riskTolerance: 'conservative'
    });
    socket.emit('chat_initialized', { sessionId });
  });

  // Обработка текстовых сообщений с банковским контекстом
  socket.on('send_message', async (data) => {
    try {
      const { message, sessionId, context } = data;
      const session = chatSessions.get(sessionId) || [];
      const userProfile = userProfiles.get(sessionId) || {};
      
      // Добавляем сообщение пользователя
      session.push({ role: 'user', content: message });
      
      // Выбираем системный промпт в зависимости от контекста
      let systemPrompt = BANK_SYSTEM_PROMPTS.FINANCIAL_ADVISOR;
      if (context === 'goal_planning') {
        systemPrompt = BANK_SYSTEM_PROMPTS.GOAL_PLANNING;
      } else if (context === 'expense_analysis') {
        systemPrompt = BANK_SYSTEM_PROMPTS.EXPENSE_ANALYSIS;
      }
      
      // Отправляем сообщение в OpenAI
      const response = await openaiClient.chatCompletion(session, systemPrompt);
      const aiMessage = response.choices[0].message.content;
      
      // Добавляем ответ AI
      session.push({ role: 'assistant', content: aiMessage });
      chatSessions.set(sessionId, session);
      
      // Отправляем ответ клиенту
      socket.emit('ai_response', {
        message: aiMessage,
        sessionId: sessionId
      });
      
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { message: 'Ошибка при обработке сообщения' });
    }
  });

  // Анализ финансовых целей
  socket.on('analyze_goal', (data) => {
    try {
      const { goal, sessionId } = data;
      const userProfile = userProfiles.get(sessionId) || {};
      
      const analysis = bankAssistant.analyzeFinancialGoal(
        goal, 
        userProfile.income, 
        userProfile.monthlyExpenses || 0,
        goal.timeline || 12
      );
      
      socket.emit('goal_analysis', {
        analysis,
        sessionId
      });
      
    } catch (error) {
      console.error('Error analyzing goal:', error);
      socket.emit('error', { message: 'Ошибка при анализе цели' });
    }
  });

  // Анализ расходов
  socket.on('analyze_expenses', (data) => {
    try {
      const { expenses, sessionId } = data;
      const analysis = bankAssistant.analyzeExpenses(expenses);
      
      socket.emit('expense_analysis', {
        analysis,
        sessionId
      });
      
    } catch (error) {
      console.error('Error analyzing expenses:', error);
      socket.emit('error', { message: 'Ошибка при анализе расходов' });
    }
  });

  // Обновление профиля пользователя
  socket.on('update_profile', (data) => {
    try {
      const { profile, sessionId } = data;
      const currentProfile = userProfiles.get(sessionId) || {};
      userProfiles.set(sessionId, { ...currentProfile, ...profile });
      
      socket.emit('profile_updated', { sessionId });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      socket.emit('error', { message: 'Ошибка при обновлении профиля' });
    }
  });

  // Получение рекомендаций продуктов
  socket.on('get_recommendations', (data) => {
    try {
      const { sessionId } = data;
      const userProfile = userProfiles.get(sessionId) || {};
      const recommendations = productCatalog.getRecommendations(userProfile);
      
      socket.emit('product_recommendations', {
        recommendations,
        sessionId
      });
      
    } catch (error) {
      console.error('Error getting recommendations:', error);
      socket.emit('error', { message: 'Ошибка при получении рекомендаций' });
    }
  });

  // Поиск продуктов
  socket.on('search_products', (data) => {
    try {
      const { query, filters, sessionId } = data;
      const results = productCatalog.searchProducts(query, filters);
      
      socket.emit('product_search_results', {
        query,
        results,
        total: results.length,
        sessionId
      });
      
    } catch (error) {
      console.error('Error searching products:', error);
      socket.emit('error', { message: 'Ошибка при поиске продуктов' });
    }
  });

  // Получение продукта по ID
  socket.on('get_product', (data) => {
    try {
      const { productId, sessionId } = data;
      const product = productCatalog.getProductById(productId);
      
      if (product) {
        socket.emit('product_details', {
          product,
          sessionId
        });
      } else {
        socket.emit('error', { message: 'Продукт не найден' });
      }
      
    } catch (error) {
      console.error('Error getting product:', error);
      socket.emit('error', { message: 'Ошибка при получении продукта' });
    }
  });

  // Получение категорий продуктов
  socket.on('get_product_categories', (data) => {
    try {
      const { sessionId } = data;
      const categories = productCatalog.getCategories();
      const types = productCatalog.getTypes();
      const stats = productCatalog.getStats();
      
      socket.emit('product_categories', {
        categories,
        types,
        stats,
        sessionId
      });
      
    } catch (error) {
      console.error('Error getting categories:', error);
      socket.emit('error', { message: 'Ошибка при получении категорий' });
    }
  });

  // Обработка аудио сообщений
  socket.on('send_audio', async (data) => {
    try {
      const { audioData, sessionId } = data;
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Транскрибируем аудио в текст
      const transcription = await openaiClient.transcribeAudio(audioBuffer);
      const transcribedText = transcription.text;
      
      // Обрабатываем транскрибированный текст как обычное сообщение
      const session = chatSessions.get(sessionId) || [];
      session.push({ role: 'user', content: transcribedText });
      
      const response = await openaiClient.chatCompletion(session, BANK_SYSTEM_PROMPTS.FINANCIAL_ADVISOR);
      const aiMessage = response.choices[0].message.content;
      
      session.push({ role: 'assistant', content: aiMessage });
      chatSessions.set(sessionId, session);
      
      socket.emit('ai_response', {
        message: aiMessage,
        transcribedText: transcribedText,
        sessionId: sessionId
      });
      
    } catch (error) {
      console.error('Error processing audio:', error);
      socket.emit('error', { message: 'Ошибка при обработке аудио' });
    }
  });

  // Создание эмбеддингов
  socket.on('create_embedding', async (data) => {
    try {
      const { text } = data;
      const embedding = await openaiClient.createEmbedding(text);
      
      socket.emit('embedding_created', {
        embedding: embedding.data[0].embedding,
        text: text
      });
      
    } catch (error) {
      console.error('Error creating embedding:', error);
      socket.emit('error', { message: 'Ошибка при создании эмбеддинга' });
    }
  });

  // Очистка сессии
  socket.on('clear_chat', (sessionId) => {
    chatSessions.set(sessionId, []);
    socket.emit('chat_cleared', { sessionId });
  });

  socket.on('disconnect', () => {
    console.log('Bank client disconnected:', socket.id);
    chatSessions.delete(socket.id);
    userProfiles.delete(socket.id);
  });
});

// REST API endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const session = chatSessions.get(sessionId) || [];
    
    session.push({ role: 'user', content: message });
    const response = await openaiClient.chatCompletion(session, BANK_SYSTEM_PROMPTS.FINANCIAL_ADVISOR);
    const aiMessage = response.choices[0].message.content;
    
    session.push({ role: 'assistant', content: aiMessage });
    chatSessions.set(sessionId, session);
    
    res.json({ message: aiMessage, sessionId });
  } catch (error) {
    console.error('API chat error:', error);
    res.status(500).json({ error: 'Ошибка при обработке сообщения' });
  }
});

app.get('/api/products', (req, res) => {
  const { search, category, islamic, minAmount, maxAmount } = req.query;
  
  const filters = {};
  if (category) filters.category = category;
  if (islamic !== undefined) filters.islamic = islamic === 'true';
  if (minAmount) filters.minAmount = parseInt(minAmount);
  if (maxAmount) filters.maxAmount = parseInt(maxAmount);
  
  const products = productCatalog.searchProducts(search, filters);
  res.json({
    products: products,
    total: products.length,
    stats: productCatalog.getStats()
  });
});

app.get('/api/products/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Параметр поиска q обязателен' });
  }
  
  const results = productCatalog.searchProducts(q);
  res.json({
    query: q,
    results: results,
    total: results.length
  });
});

app.get('/api/products/categories', (req, res) => {
  res.json({
    categories: productCatalog.getCategories(),
    types: productCatalog.getTypes(),
    stats: productCatalog.getStats()
  });
});

app.get('/api/products/islamic', (req, res) => {
  const islamicProducts = productCatalog.getIslamicProducts();
  res.json({
    products: islamicProducts,
    total: islamicProducts.length
  });
});

app.get('/api/products/retail', (req, res) => {
  const retailProducts = productCatalog.getRetailProducts();
  res.json({
    products: retailProducts,
    total: retailProducts.length
  });
});

app.get('/api/products/sme', (req, res) => {
  const smeProducts = productCatalog.getSMEProducts();
  res.json({
    products: smeProducts,
    total: smeProducts.length
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = productCatalog.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Продукт не найден' });
  }
  res.json(product);
});

app.get('/api/goals', (req, res) => {
  res.json(config.FINANCIAL_GOALS);
});

app.get('/api/terms', (req, res) => {
  res.json(config.ISLAMIC_TERMS);
});

app.get('/api/tips', (req, res) => {
  res.json(config.OPTIMIZATION_TIPS);
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🏦 Zaman Bank AI Assistant запущен на порту ${PORT}`);
  console.log(`🌐 Откройте http://localhost:${PORT} в браузере`);
  console.log(`🤖 Готов помочь с финансовым планированием!`);
});
