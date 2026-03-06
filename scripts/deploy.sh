#!/bin/bash

# Скрипт автоматического развёртывания TypeScript-проекта с миграциями и pm2
# Использование: ./scripts/deploy.sh [--install]

set -e  # Прерывать выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APP_NAME="taskmaster-backend"      # Имя процесса в pm2
SCRIPT_PATH="dist/src/server.js"   # Путь к скомпилированному серверу от корня проекта

# Абсолютный путь к директории скрипта
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Переход в корень проекта (на уровень выше папки scripts)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}🔧 Начинаем развёртывание проекта...${NC}"
echo -e "${YELLOW}📁 Корень проекта: $PROJECT_ROOT${NC}"

# 1. Установка зависимостей (опционально, если передан флаг --install)
if [[ "$1" == "--install" ]]; then
    echo -e "${YELLOW}📦 Устанавливаем зависимости (включая dev)...${NC}"
    npm install
else
    echo -e "${GREEN}⏩ Пропускаем установку зависимостей (используйте --install, если нужно).${NC}"
fi

# 2. Сборка проекта
echo -e "${YELLOW}🔨 Собираем проект (npm run build)...${NC}"
npm run build

# 3. Копирование миграций (если они ещё не в dist/)
if [ ! -d "dist/migrations" ]; then
    echo -e "${YELLOW}📂 Копируем папку migrations в dist/...${NC}"
    cp -r migrations dist/
else
    echo -e "${GREEN}✅ Папка migrations уже есть в dist/.${NC}"
fi

# 4. Применение миграций
echo -e "${YELLOW}🗄️  Применяем миграции к базе данных...${NC}"
npm run migrate:prod

# 5. Остановка и удаление старого процесса pm2 (если он существует с таким именем)
if pm2 list | grep -q "$APP_NAME"; then
    echo -e "${YELLOW}🛑 Останавливаем и удаляем старый процесс $APP_NAME...${NC}"
    pm2 stop "$APP_NAME" > /dev/null 2>&1 || true
    pm2 delete "$APP_NAME" > /dev/null 2>&1 || true
else
    echo -e "${GREEN}✅ Процесс $APP_NAME не найден, пропускаем удаление.${NC}"
fi

# 6. Запуск нового процесса
echo -e "${YELLOW}🚀 Запускаем приложение через pm2...${NC}"
pm2 start "$SCRIPT_PATH" --name "$APP_NAME"

# 7. Сохранение списка процессов
echo -e "${YELLOW}💾 Сохраняем список процессов pm2...${NC}"
pm2 save

# 8. Показываем статус
echo -e "${GREEN}✅ Развёртывание завершено! Статус процессов:${NC}"
pm2 status

# 9. Показать последние логи
echo -e "${YELLOW}📋 Последние 10 строк лога:${NC}"
pm2 logs "$APP_NAME" --lines 10 --nostream