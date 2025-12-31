# Helius RPC Optimization - Архитектура и Реализация

## Обзор

Данный документ описывает систему оптимизации RPC запросов для минимизации использования Helius API и решения проблем доверия Phantom кошелька.

## Архитектура системы

```
Пользователь → [Клиент (React)]
       ↓
[HeliusRPCOptimizer] ← LRU Cache + Batching + Throttle
       ↓
[Helius RPC / Fallback RPC]
       ↓
[Helius Webhook] → [/api/helius-webhook] → [In-Memory Cache]
       ↓
[Клиент] ← Оптимистичные обновления
```

## Ключевые компоненты

### 1. HeliusRPCOptimizer (`lib/sdk/helius/rpc-optimizer.ts`)

Централизованный менеджер RPC с:
- **LRU Cache** для всех типов данных (аккаунты, балансы, транзакции)
- **Batch Requests** для группировки запросов
- **Throttling** с exponential backoff при 429 ошибках
- **Auto-fallback** на публичный RPC при превышении лимитов

```typescript
// Использование
import { HeliusRPCOptimizer } from '@/lib/sdk/helius';

// Вместо прямого вызова connection.getAccountInfo()
const account = await HeliusRPCOptimizer.getAccountInfo(connection, publicKey);

// Вместо прямого вызова connection.getBalance()
const balance = await HeliusRPCOptimizer.getBalance(connection, publicKey);

// Батчевое получение нескольких аккаунтов (1 запрос вместо N)
const accounts = await HeliusRPCOptimizer.getMultipleAccountsInfo(connection, publicKeys);
```

### 2. HELIUS_CONFIG (`lib/sdk/helius/config.ts`)

Централизованная конфигурация:
- Endpoints (primary, webhook, fallback)
- Cache TTL для разных типов данных
- Rate limits и throttle настройки
- Feature flags для включения/отключения оптимизаций

### 3. RPCTracker (`lib/sdk/helius/rpc-tracker.ts`)

Мониторинг использования RPC:
- Подсчёт запросов в минуту
- Автоматические алерты при приближении к лимиту
- Автоматическое переключение на fallback

### 4. Webhook API (`app/api/helius-webhook/route.ts`)

Endpoint для получения push-уведомлений от Helius:
- Замена polling на webhooks
- In-memory кэш статусов транзакций
- Отслеживание активаций игроков

## Оптимизации по файлам

### `lib/sdk/fetch.ts`

**До:**
```typescript
// 16 последовательных запросов для получения активных уровней
for (let lvl = 1; lvl <= MAX_LEVELS; lvl++) {
  const st = await fetchLevelStateNullable(connection, playerPda, lvl);
  // ...
}
```

**После:**
```typescript
// 1 батчевый запрос для всех уровней
const accounts = await HeliusRPCOptimizer.getMultipleAccountsInfo(
  connection,
  levelPdas.map(item => item.pda),
  DEFAULT_COMMITMENT
);
```

### `lib/sdk/tx.ts`

Добавлена pre-simulation для Phantom Trust:
- Проверка Compute Units перед отправкой
- Предотвращение "suspicious transaction" предупреждений
- Валидация транзакции до показа пользователю

### `lib/sdk/hooks/useWalletBalance.ts`

**До:**
- Прямой вызов `connection.getBalance()` каждые 30 сек
- Нет кэширования

**После:**
- Использование `HeliusRPCOptimizer.getBalance()` с кэшем
- Debouncing для предотвращения частых запросов
- Возврат объекта `{ balance, isLoading, refresh }`

### `lib/sdk/activate-builder.ts`

Все вызовы `connection.getAccountInfo()` заменены на `HeliusRPCOptimizer.getAccountInfo()` с автоматическим кэшированием.

## Конфигурация

### Переменные окружения

```env
# Helius API
NEXT_PUBLIC_HELIUS_API_KEY=your_key_here

# Режим оптимизации
NEXT_PUBLIC_RPC_MODE=optimized
NEXT_PUBLIC_USE_HELIUS_WEBHOOKS=true
NEXT_PUBLIC_AGGRESSIVE_CACHING=true
NEXT_PUBLIC_ENABLE_BATCHING=true

# Cache TTL (ms)
NEXT_PUBLIC_CACHE_TTL_ACCOUNT=60000
NEXT_PUBLIC_CACHE_TTL_BALANCE=30000
NEXT_PUBLIC_CACHE_TTL_LEVEL=15000

# Limits
NEXT_PUBLIC_MAX_RPC_REQUESTS_PER_MINUTE=60
NEXT_PUBLIC_MAX_COMPUTE_UNITS=200000
```

## Метрики и мониторинг

```typescript
// Получение метрик
const metrics = HeliusRPCOptimizer.getMetrics();
console.log(`Cache hit rate: ${metrics.cachedHits / (metrics.totalRequests + metrics.cachedHits) * 100}%`);

// Логирование метрик
HeliusRPCOptimizer.logMetrics();

// Проверка алертов
HeliusRPCOptimizer.checkUsageAlerts();
```

## Экономия RPC запросов

| Операция | До | После | Экономия |
|----------|-----|-------|----------|
| Загрузка активных уровней | 16 запросов | 1 запрос | 93.75% |
| Повторное получение баланса | 1 запрос | 0 (кэш) | 100% |
| Повторное чтение Config | 1 запрос | 0 (кэш) | 100% |
| Статус транзакции | polling | webhook | 100% |

## Phantom Trust оптимизации

1. **Pre-simulation** - проверка транзакции до показа пользователю
2. **Compute Unit validation** - блокировка транзакций > 200k CU
3. **Simplified transactions** - минимальное количество signers
4. **Program verification** - использование верифицированной программы

## Webhook настройка

```bash
# Создание webhook в Helius
curl -X POST "https://api.helius.xyz/v0/webhooks?api-key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "webhookURL": "https://your-app.com/api/helius-webhook",
    "transactionTypes": ["ANY"],
    "accountAddresses": ["YOUR_PROGRAM_ID"],
    "webhookType": "enhanced"
  }'
```

## Резюме оптимизаций

1. ✅ **Агрессивное кэширование** - LRU cache для всех данных
2. ✅ **Вебхуки вместо polling** - push вместо pull
3. ✅ **Батчинг запросов** - группировка в один запрос
4. ✅ **Throttling** - защита от 429 ошибок
5. ✅ **Auto-fallback** - переключение на публичный RPC
6. ✅ **Pre-simulation** - для Phantom trust
7. ✅ **Мониторинг** - метрики и алерты
8. ✅ **Централизованный RPC менеджер** - все вызовы через один модуль

