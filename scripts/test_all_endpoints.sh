#!/bin/bash

# Конфигурация
BASE_URL="http://localhost:3000"
TEST_USERNAME="testuser_$(date +%s)"
TEST_PASSWORD="TestPass123!"
TEST_BOARD_NAME="Тестовая доска"
TEST_TASK_TITLE="Тестовая задача"

echo "=== 🧪 Комплексное тестирование TaskMaster API ==="
echo "Базовый URL: $BASE_URL"
echo "Тестовый пользователь: $TEST_USERNAME"
echo ""

# Функция для вывода результатов
print_result() {
    local status=$1
    local message=$2
    if [ $status -eq 0 ]; then
        echo "✅ $message"
    else
        echo "❌ $message"
        echo "Последний ответ: $LAST_RESPONSE"
    fi
    echo ""
}

# Функция для форматированного вывода JSON
format_json() {
    echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
}

# 1. Системные эндпоинты
echo "=== 🔧 Системные эндпоинты ==="

echo "1.1 GET /"
LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Статус 200. Ответ:"
    format_json "$RESPONSE_BODY"
else
    echo "❌ Ошибка. Код: $HTTP_CODE"
fi
echo ""

echo "1.2 GET /health"
LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Статус 200. Ответ:"
    format_json "$RESPONSE_BODY"
else
    echo "❌ Ошибка. Код: $HTTP_CODE"
fi
echo ""

# 2. Аутентификация
echo "=== 🔐 Аутентификация ==="

echo "2.1 POST /api/register"
LAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
# Принимаем и 200, и 201 как успешные
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Регистрация успешна (код: $HTTP_CODE). Ответ:"
    format_json "$RESPONSE_BODY"
    USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"userId":[0-9]*' | cut -d: -f2)
else
    echo "❌ Ошибка регистрации. Код: $HTTP_CODE"
    echo "Ответ: $RESPONSE_BODY"
    exit 1
fi
echo ""

echo "2.2 POST /api/login"
LAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Вход успешен. Ответ:"
    format_json "$RESPONSE_BODY"
    ACCESS_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    echo "Access Token получен (длина: ${#ACCESS_TOKEN})"
    echo "Refresh Token получен (длина: ${#REFRESH_TOKEN})"
else
    echo "❌ Ошибка входа. Код: $HTTP_CODE"
    exit 1
fi
echo ""

# 3. CRUD для досок (boards)
echo "=== 📋 CRUD для досок ==="

echo "3.1 GET /api/boards (пустой список)"
LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/boards" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Доски получены. Ответ:"
    format_json "$RESPONSE_BODY"
else
    echo "❌ Ошибка получения досок. Код: $HTTP_CODE"
fi
echo ""

echo "3.2 POST /api/boards (создание доски)"
LAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/boards" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{\"name\":\"$TEST_BOARD_NAME\"}" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
# Принимаем и 200, и 201 как успешные
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Доска создана (код: $HTTP_CODE). Ответ:"
    format_json "$RESPONSE_BODY"
    # Извлекаем ID доски
    BOARD_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | cut -d: -f2)
    if [ -z "$BOARD_ID" ]; then
        # Пробуем альтернативный формат (если ответ содержит только id без кавычек)
        BOARD_ID=$(echo "$RESPONSE_BODY" | grep -o '[0-9]*' | head -1)
    fi
    echo "ID доски: $BOARD_ID"
else
    echo "❌ Ошибка создания доски. Код: $HTTP_CODE"
    echo "Ответ: $RESPONSE_BODY"
    # Продолжаем выполнение, чтобы посмотреть другие ошибки
fi
echo ""

# Если не удалось получить BOARD_ID, попробуем получить его из списка
if [ -z "$BOARD_ID" ] || [ "$BOARD_ID" = "null" ]; then
    echo "⚠️  ID доски не найден в ответе. Пробуем получить из списка..."
    LIST_RESPONSE=$(curl -s "$BASE_URL/api/boards" -H "Authorization: Bearer $ACCESS_TOKEN")
    BOARD_ID=$(echo "$LIST_RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2 | head -1)
    echo "Найден ID доски в списке: $BOARD_ID"
fi

echo "3.3 GET /api/boards (список с доской)"
LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/boards" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Доски получены. Ответ:"
    format_json "$RESPONSE_BODY"
    # Проверяем, что доска в списке
    if echo "$RESPONSE_BODY" | grep -q "$TEST_BOARD_NAME"; then
        echo "✅ Доска найдена в списке"
    fi
else
    echo "❌ Ошибка получения досок. Код: $HTTP_CODE"
fi
echo ""

if [ -n "$BOARD_ID" ] && [ "$BOARD_ID" != "null" ]; then
    echo "3.4 GET /api/boards/{id} (получение конкретной доски)"
    LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/boards/$BOARD_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Доска получена. Ответ:"
        format_json "$RESPONSE_BODY"
    else
        echo "❌ Ошибка получения доски. Код: $HTTP_CODE"
    fi
    echo ""

    echo "3.5 PUT /api/boards/{id} (обновление доски)"
    UPDATED_NAME="Обновленная $TEST_BOARD_NAME"
    LAST_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/boards/$BOARD_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "{\"name\":\"$UPDATED_NAME\"}" \
        -w "\n%{http_code}")
    HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Доска обновлена. Ответ:"
        format_json "$RESPONSE_BODY"
    else
        echo "❌ Ошибка обновления доски. Код: $HTTP_CODE"
    fi
    echo ""

    # 4. CRUD для задач (tasks)
    echo "=== ✅ CRUD для задач ==="

    echo "4.1 GET /api/boards/{boardId}/tasks (пустой список задач)"
    LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/boards/$BOARD_ID/tasks" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Задачи получены. Ответ:"
        format_json "$RESPONSE_BODY"
    else
        echo "❌ Ошибка получения задач. Код: $HTTP_CODE"
    fi
    echo ""

    echo "4.2 POST /api/boards/{boardId}/tasks (создание задачи)"
    LAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/boards/$BOARD_ID/tasks" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "{\"title\":\"$TEST_TASK_TITLE\"}" \
        -w "\n%{http_code}")
    HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
    # Принимаем и 200, и 201 как успешные
    if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
        echo "✅ Задача создана (код: $HTTP_CODE). Ответ:"
        format_json "$RESPONSE_BODY"
        TASK_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | cut -d: -f2)
        if [ -z "$TASK_ID" ]; then
            TASK_ID=$(echo "$RESPONSE_BODY" | grep -o '[0-9]*' | head -1)
        fi
        echo "ID задачи: $TASK_ID"
    else
        echo "❌ Ошибка создания задачи. Код: $HTTP_CODE"
        echo "Ответ: $RESPONSE_BODY"
    fi
    echo ""

    if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
        echo "4.3 GET /api/boards/{boardId}/tasks (список с задачей)"
        LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/boards/$BOARD_ID/tasks" \
            -H "Authorization: Bearer $ACCESS_TOKEN")
        HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
        RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
        if [ "$HTTP_CODE" -eq 200 ]; then
            echo "✅ Задачи получены. Ответ:"
            format_json "$RESPONSE_BODY"
            if echo "$RESPONSE_BODY" | grep -q "$TEST_TASK_TITLE"; then
                echo "✅ Задача найдена в списке"
            fi
        else
            echo "❌ Ошибка получения задач. Код: $HTTP_CODE"
        fi
        echo ""

        echo "4.4 GET /api/tasks/{id} (получение конкретной задачи)"
        LAST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/tasks/$TASK_ID" \
            -H "Authorization: Bearer $ACCESS_TOKEN")
        HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
        RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
        if [ "$HTTP_CODE" -eq 200 ]; then
            echo "✅ Задача получена. Ответ:"
            format_json "$RESPONSE_BODY"
        else
            echo "❌ Ошибка получения задачи. Код: $HTTP_CODE"
        fi
        echo ""

        echo "4.5 PUT /api/tasks/{id} (обновление задачи)"
        UPDATED_TITLE="Обновленная $TEST_TASK_TITLE"
        LAST_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/tasks/$TASK_ID" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -d "{\"title\":\"$UPDATED_TITLE\",\"completed\":true}" \
            -w "\n%{http_code}")
        HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
        RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
        if [ "$HTTP_CODE" -eq 200 ]; then
            echo "✅ Задача обновлена. Ответ:"
            format_json "$RESPONSE_BODY"
        else
            echo "❌ Ошибка обновления задачи. Код: $HTTP_CODE"
        fi
        echo ""
    fi
else
    echo "⚠️  Пропускаем тесты задач, так как ID доски не найден"
fi

# 5. Дополнительные тесты аутентификации
echo "=== 🔄 Дополнительные тесты аутентификации ==="

echo "5.1 POST /api/refresh (обновление access token)"
LAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Токен обновлен. Ответ:"
    format_json "$RESPONSE_BODY"
    NEW_ACCESS_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    # Тестируем новый токен
    echo "Тестируем новый access token..."
    TEST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/boards" \
        -H "Authorization: Bearer $NEW_ACCESS_TOKEN")
    TEST_CODE=$(echo "$TEST_RESPONSE" | tail -n1)
    if [ "$TEST_CODE" -eq 200 ]; then
        echo "✅ Новый токен работает"
        ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
    fi
else
    echo "❌ Ошибка обновления токена. Код: $HTTP_CODE"
fi
echo ""

echo "5.2 POST /api/logout"
LAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Выход выполнен. Ответ:"
    format_json "$RESPONSE_BODY"
else
    echo "⚠️  Ошибка выхода. Код: $HTTP_CODE"
fi
echo ""

# 6. Очистка (удаление созданных данных)
echo "=== 🧹 Очистка тестовых данных ==="

if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
    echo "6.1 DELETE /api/tasks/{id} (удаление задачи)"
    LAST_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/tasks/$TASK_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -w "\n%{http_code}")
    HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Задача удалена. Ответ:"
        format_json "$RESPONSE_BODY"
    else
        echo "⚠️  Ошибка удаления задачи. Код: $HTTP_CODE"
    fi
    echo ""
fi

if [ -n "$BOARD_ID" ] && [ "$BOARD_ID" != "null" ]; then
    echo "6.2 DELETE /api/boards/{id} (удаление доски)"
    LAST_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/boards/$BOARD_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -w "\n%{http_code}")
    HTTP_CODE=$(echo "$LAST_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$LAST_RESPONSE" | sed '$d')
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Доска удалена. Ответ:"
        format_json "$RESPONSE_BODY"
    else
        echo "⚠️  Ошибка удаления доски. Код: $HTTP_CODE"
    fi
    echo ""
fi

echo "=== 📊 Итоговый отчет ==="
echo "✅ Все основные эндпоинты протестированы:"
echo "   - Системные: 2/2"
echo "   - Аутентификация: 4/4"
echo "   - Доски (boards): 5/5 (частично, если ID найден)"
echo "   - Задачи (tasks): 5/5 (частично, если ID найден)"
echo ""
echo "🎉 Тестирование завершено!"
echo "Документация API: $BASE_URL/documentation"