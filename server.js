const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const config = require('./config');

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

  async chatCompletion(messages) {
    try {
      const response = await axios.post(`${this.baseURL}/v1/chat/completions`, {
        model: config.MODELS.GPT,
        messages: messages,
        max_tokens: 1000,
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

// Хранилище сессий чата
const chatSessions = new Map();

// Socket.IO обработчики
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Инициализация сессии чата
  socket.on('init_chat', () => {
    const sessionId = socket.id;
    chatSessions.set(sessionId, []);
    socket.emit('chat_initialized', { sessionId });
  });

  // Обработка текстовых сообщений
  socket.on('send_message', async (data) => {
    try {
      const { message, sessionId } = data;
      const session = chatSessions.get(sessionId) || [];
      
      // Добавляем сообщение пользователя
      session.push({ role: 'user', content: message });
      
      // Отправляем сообщение в OpenAI
      const response = await openaiClient.chatCompletion(session);
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
      
      const response = await openaiClient.chatCompletion(session);
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
    console.log('User disconnected:', socket.id);
    chatSessions.delete(socket.id);
  });
});

// REST API endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const session = chatSessions.get(sessionId) || [];
    
    session.push({ role: 'user', content: message });
    const response = await openaiClient.chatCompletion(session);
    const aiMessage = response.choices[0].message.content;
    
    session.push({ role: 'assistant', content: aiMessage });
    chatSessions.set(sessionId, session);
    
    res.json({ message: aiMessage, sessionId });
  } catch (error) {
    console.error('API chat error:', error);
    res.status(500).json({ error: 'Ошибка при обработке сообщения' });
  }
});

app.post('/api/embedding', async (req, res) => {
  try {
    const { text } = req.body;
    const embedding = await openaiClient.createEmbedding(text);
    res.json({ embedding: embedding.data[0].embedding });
  } catch (error) {
    console.error('API embedding error:', error);
    res.status(500).json({ error: 'Ошибка при создании эмбеддинга' });
  }
});

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Аудио файл не найден' });
    }
    
    const transcription = await openaiClient.transcribeAudio(req.file.buffer);
    res.json({ text: transcription.text });
  } catch (error) {
    console.error('API transcription error:', error);
    res.status(500).json({ error: 'Ошибка при транскрипции аудио' });
  }
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = config.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});
