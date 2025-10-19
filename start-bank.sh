#!/bin/bash

echo "🏦 =========================================="
echo "🏦  Zaman Bank AI Финансовый Ассистент"
echo "🏦 =========================================="
echo ""

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js и попробуйте снова."
    exit 1
fi

# Проверка наличия npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен. Установите npm и попробуйте снова."
    exit 1
fi

echo "✅ Node.js установлен: $(node --version)"
echo "✅ npm установлен: $(npm --version)"
echo ""

# Проверка зависимостей
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
    echo ""
fi

echo "🚀 Запуск банковского сервера..."
echo "🌐 Откройте http://localhost:3001 в браузере"
echo "⏹️  Для остановки нажмите Ctrl+C"
echo ""

# Запуск сервера
node bank-server.js
