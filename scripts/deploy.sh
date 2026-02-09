#!/bin/bash

# =============================================
# Деплой TaskMaster API на сервере
# Версия: 1.0
# =============================================

# Настройки
set -e  # Прерывать выполнение при ошибках
PROJECT_NAME="taskmaster-api"
PROJECT_DIR="/var/www/taskmaster"
REPO_URL="https://github.com/VladimirKraswov/TaskMaster-backend.git"
BRANCH="main"  # или master, в зависимости от вашего репозитория

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав пользователя
check_permissions() {
    log_info "Проверка прав пользователя..."
    if [[ $EUID -eq 0 ]]; then
        log_warning "Скрипт запущен от root. Рекомендуется использовать обычного пользователя с sudo."
        read -p "Продолжить? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Прерывание выполнения..."
            exit 1
        fi
    fi
}

# Проверка зависимостей
check_dependencies() {
    log_info "Проверка системных зависимостей..."
    
    local missing_deps=()
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        log_info "Node.js версии $NODE_VERSION обнаружена"
    fi
    
    # Проверка npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Проверка PM2
    if ! command -v pm2 &> /dev/null; then
        missing_deps+=("PM2")
    fi
    
    # Проверка Git
    if ! command -v git &> /dev/null; then
        missing_deps+=("Git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Отсутствуют необходимые зависимости: ${missing_deps[*]}"
        
        # Предложение установить зависимости
        if [ -f /etc/debian_version ]; then
            log_info "Обнаружена Debian/Ubuntu система"
            read -p "Установить зависимости автоматически? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_dependencies_debian
            else
                exit 1
            fi
        else
            log_info "Установите зависимости вручную:"
            for dep in "${missing_deps[@]}"; do
                echo "  - $dep"
            done
            exit 1
        fi
    else
        log_success "Все зависимости установлены"
    fi
}

install_dependencies_debian() {
    log_info "Установка зависимостей для Debian/Ubuntu..."
    sudo apt update
    sudo apt install -y curl git
    
    # Установка Node.js (если не установлена)
    if ! command -v node &> /dev/null; then
        log_info "Установка Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    # Установка PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "Установка PM2..."
        sudo npm install -g pm2
    fi
    
    log_success "Зависимости установлены"
}

# Создание структуры директорий
create_project_structure() {
    log_info "Создание структуры проекта..."
    
    # Создание директории проекта
    if [ ! -d "$PROJECT_DIR" ]; then
        log_info "Создание директории проекта: $PROJECT_DIR"
        sudo mkdir -p "$PROJECT_DIR"
        sudo chown -R $USER:$USER "$PROJECT_DIR"
    else
        log_info "Директория проекта уже существует: $PROJECT_DIR"
    fi
    
    # Создание директории для логов
    LOG_DIR="/var/log/$PROJECT_NAME"
    if [ ! -d "$LOG_DIR" ]; then
        log_info "Создание директории логов: $LOG_DIR"
        sudo mkdir -p "$LOG_DIR"
        sudo chown -R $USER:$USER "$LOG_DIR"
    fi
}

# Клонирование/обновление репозитория
clone_or_update_repo() {
    log_info "Работа с репозиторием..."
    
    cd "$PROJECT_DIR"
    
    if [ ! -d ".git" ]; then
        log_info "Клонирование репозитория..."
        git clone "$REPO_URL" .
    else
        log_info "Обновление существующего репозитория..."
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    fi
    
    # Проверка успешности
    if [ $? -ne 0 ]; then
        log_error "Ошибка при работе с репозиторием"
        exit 1
    fi
    
    log_success "Репозиторий обновлен"
}

# Настройка переменных окружения
setup_environment() {
    log_info "Настройка переменных окружения..."
    
    cd "$PROJECT_DIR"
    
    # Проверка существования .env
    if [ ! -f ".env" ]; then
        log_info "Создание файла .env из примера..."
        
        # Создаем базовый .env файл для production
        cat > .env << EOF
# === Основные настройки ===
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# === Безопасность ===
# Сгенерируйте новые ключи командой:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# === База данных SQLite ===
DATABASE_URL=$PROJECT_DIR/prod.sqlite3

# === Дополнительные настройки ===
LOG_LEVEL=info
EOF
        
        log_warning "Создан новый файл .env. Отредактируйте его при необходимости!"
        log_info "Файл .env расположен в: $PROJECT_DIR/.env"
        
        # Показываем содержимое для проверки
        echo ""
        log_info "Содержимое .env файла:"
        echo "========================================"
        cat .env
        echo "========================================"
        echo ""
        
        read -p "Проверьте настройки и нажмите Enter для продолжения..."
    else
        log_info "Файл .env уже существует"
    fi
    
    # Установка прав на .env
    chmod 600 .env
}

# Установка зависимостей проекта
install_project_dependencies() {
    log_info "Установка зависимостей проекта..."
    
    cd "$PROJECT_DIR"
    
    # Проверка существования package.json
    if [ ! -f "package.json" ]; then
        log_error "Файл package.json не найден!"
        exit 1
    fi
    
    # Установка зависимостей
    log_info "Выполнение npm install --production..."
    npm install --production
    
    if [ $? -ne 0 ]; then
        log_error "Ошибка при установке зависимостей npm"
        exit 1
    fi
    
    log_success "Зависимости проекта установлены"
}

# Выполнение миграций базы данных
run_migrations() {
    log_info "Выполнение миграций базы данных..."
    
    cd "$PROJECT_DIR"
    
    # Проверка существования knexfile.js
    if [ ! -f "knexfile.js" ]; then
        log_error "Файл knexfile.js не найден!"
        exit 1
    fi
    
    # Проверка существования директории миграций
    if [ ! -d "migrations" ]; then
        log_warning "Директория migrations не найдена. Пропускаем миграции."
        return 0
    fi
    
    # Выполнение миграций
    log_info "Запуск миграций для production..."
    NODE_ENV=production npx knex migrate:latest
    
    if [ $? -ne 0 ]; then
        log_error "Ошибка при выполнении миграций"
        exit 1
    fi
    
    # Проверка, создался ли файл базы данных
    if [ -f "prod.sqlite3" ]; then
        log_info "Настройка прав на файл базы данных..."
        chmod 644 prod.sqlite3
        
        # Проверка целостности БД
        if command -v sqlite3 &> /dev/null; then
            log_info "Проверка целостности базы данных..."
            if sqlite3 prod.sqlite3 "PRAGMA integrity_check;" | grep -q "ok"; then
                log_success "База данных прошла проверку целостности"
            else
                log_warning "Предупреждение при проверке целостности БД"
            fi
        fi
    fi
    
    log_success "Миграции выполнены успешно"
}

# Настройка и запуск PM2
setup_pm2() {
    log_info "Настройка PM2..."
    
    cd "$PROJECT_DIR"
    
    # Остановка существующего процесса (если есть)
    if pm2 list | grep -q "$PROJECT_NAME"; then
        log_info "Остановка существующего процесса $PROJECT_NAME..."
        pm2 stop "$PROJECT_NAME"
        pm2 delete "$PROJECT_NAME"
    fi
    
    # Создание ecosystem файла для PM2
    log_info "Создание конфигурации PM2..."
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PROJECT_NAME',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/$PROJECT_NAME/error.log',
    out_file: '/var/log/$PROJECT_NAME/out.log',
    log_file: '/var/log/$PROJECT_NAME/combined.log',
    time: true,
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
EOF
    
    # Запуск приложения через PM2
    log_info "Запуск приложения с PM2..."
    pm2 start ecosystem.config.js --env production
    
    if [ $? -ne 0 ]; then
        log_error "Ошибка при запуске PM2"
        exit 1
    fi
    
    # Настройка автозапуска
    log_info "Настройка автозапуска PM2..."
    pm2 save
    AUTO_START_CMD=$(pm2 startup | tail -n 1)
    
    if [ ! -z "$AUTO_START_CMD" ]; then
        log_info "Выполнение команды автозапуска: $AUTO_START_CMD"
        eval "$AUTO_START_CMD"
    fi
    
    log_success "PM2 настроен и запущен"
}

# Проверка работоспособности приложения
health_check() {
    log_info "Проверка работоспособности приложения..."
    
    local max_attempts=10
    local attempt=1
    local wait_time=3
    
    log_info "Ожидание запуска приложения..."
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Попытка $attempt из $max_attempts..."
        
        # Проверка через curl
        if curl -s -f "http://localhost:3000/health" > /dev/null; then
            log_success "Приложение успешно запущено и отвечает!"
            
            # Дополнительная проверка API
            echo ""
            log_info "Детальная проверка API:"
            echo "========================================"
            
            # Проверка health endpoint
            HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
            echo "Health endpoint: $HEALTH_RESPONSE"
            
            # Проверка основного endpoint
            ROOT_RESPONSE=$(curl -s http://localhost:3000/)
            echo "Root endpoint: $ROOT_RESPONSE"
            
            # Проверка PM2 статуса
            echo ""
            log_info "Статус PM2:"
            pm2 list | grep "$PROJECT_NAME"
            
            echo "========================================"
            return 0
        fi
        
        sleep $wait_time
        attempt=$((attempt + 1))
    done
    
    log_error "Приложение не запустилось после $max_attempts попыток"
    
    # Показ логов для отладки
    echo ""
    log_info "Последние логи приложения:"
    pm2 logs "$PROJECT_NAME" --lines 20
    
    return 1
}

# Создание скрипта для быстрого управления
create_management_scripts() {
    log_info "Создание скриптов управления..."
    
    # Скрипт перезапуска
    cat > "$PROJECT_DIR/restart.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
pm2 restart taskmaster-api
echo "Приложение перезапущено"
EOF
    
    # Скрипт просмотра логов
    cat > "$PROJECT_DIR/logs.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
pm2 logs taskmaster-api
EOF
    
    # Скрипт обновления
    cat > "$PROJECT_DIR/update.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Обновление репозитория..."
git pull origin main
echo "Установка зависимостей..."
npm install --production
echo "Выполнение миграций..."
NODE_ENV=production npx knex migrate:latest
echo "Перезапуск приложения..."
pm2 restart taskmaster-api
echo "Обновление завершено"
EOF
    
    # Установка прав
    chmod +x "$PROJECT_DIR/restart.sh"
    chmod +x "$PROJECT_DIR/logs.sh"
    chmod +x "$PROJECT_DIR/update.sh"
    
    log_success "Скрипты управления созданы:"
    log_info "  restart.sh - перезапуск приложения"
    log_info "  logs.sh    - просмотр логов"
    log_info "  update.sh  - обновление кода и зависимостей"
}

# Основная функция
main() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}        Деплой TaskMaster API          ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Выполнение шагов
    check_permissions
    check_dependencies
    create_project_structure
    clone_or_update_repo
    setup_environment
    install_project_dependencies
    run_migrations
    setup_pm2
    health_check
    create_management_scripts
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}       Деплой успешно завершен!        ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Итоговая информация
    echo "📋 Информация о деплое:"
    echo "   Проект: $PROJECT_NAME"
    echo "   Директория: $PROJECT_DIR"
    echo "   URL API: http://localhost:3000"
    echo "   Логи: /var/log/$PROJECT_NAME/"
    echo ""
    echo "🛠️  Команды управления:"
    echo "   cd $PROJECT_DIR"
    echo "   ./restart.sh  # Перезапуск"
    echo "   ./logs.sh     # Просмотр логов"
    echo "   ./update.sh   # Обновление"
    echo ""
    echo "📊 Статус PM2:"
    pm2 list | grep "$PROJECT_NAME"
    echo ""
    echo "🌐 Для настройки Nginx Proxy Manager:"
    echo "   - Домен: task-master.fast-go.ru"
    echo "   - IP: 127.0.0.1"
    echo "   - Порт: 3000"
    echo ""
}

# Запуск основной функции
main "$@"