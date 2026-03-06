#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_NAME="taskmaster-backend"
SCRIPT_PATH="dist/src/server.js"
HEALTHCHECK_URL="http://127.0.0.1:3000/health"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${YELLOW}🔧 Начинаем развёртывание проекта...${NC}"
echo -e "${YELLOW}📁 Корень проекта: $PROJECT_ROOT${NC}"

echo -e "${YELLOW}🔨 Собираем проект (npm run build)...${NC}"
npm run build

mkdir -p dist

if [ -d "$PROJECT_ROOT/migrations" ]; then
    echo -e "${YELLOW}📂 Копируем migrations в dist/...${NC}"
    rm -rf "$PROJECT_ROOT/dist/migrations"
    cp -r "$PROJECT_ROOT/migrations" "$PROJECT_ROOT/dist/"
else
    echo -e "${RED}❌ Папка migrations не найдена: $PROJECT_ROOT/migrations${NC}"
    exit 1
fi

if [ -d "$PROJECT_ROOT/seeds" ]; then
    echo -e "${YELLOW}📂 Копируем seeds в dist/...${NC}"
    rm -rf "$PROJECT_ROOT/dist/seeds"
    cp -r "$PROJECT_ROOT/seeds" "$PROJECT_ROOT/dist/"
fi

echo -e "${YELLOW}🗄️  Применяем миграции к базе данных...${NC}"
npm run migrate:prod

if [ ! -f "$PROJECT_ROOT/$SCRIPT_PATH" ]; then
    echo -e "${RED}❌ Не найден файл запуска: $PROJECT_ROOT/$SCRIPT_PATH${NC}"
    exit 1
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}♻️ Перезапускаем существующий процесс $APP_NAME...${NC}"
    pm2 restart "$APP_NAME" --update-env
else
    echo -e "${YELLOW}🚀 Запускаем приложение через pm2...${NC}"
    pm2 start "$PROJECT_ROOT/$SCRIPT_PATH" --name "$APP_NAME"
fi

echo -e "${YELLOW}💾 Сохраняем список процессов pm2...${NC}"
pm2 save

echo -e "${YELLOW}🩺 Проверяем health-check...${NC}"
for i in 1 2 3 4 5; do
    if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then
        echo -e "${GREEN}✅ Сервис успешно поднят: $HEALTHCHECK_URL${NC}"
        echo -e "${GREEN}✅ Развёртывание завершено!${NC}"
        pm2 status
        exit 0
    fi
    sleep 2
done

echo -e "${RED}❌ Сервис не ответил на health-check: $HEALTHCHECK_URL${NC}"
pm2 status
pm2 logs "$APP_NAME" --lines 20 --nostream
exit 1