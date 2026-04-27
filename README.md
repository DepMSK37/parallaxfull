# Parallax — Мультибот-шлюз

Единый Telegram-бот, который объединяет 4 независимых бота через систему сессий и маршрутизации.

---

## Архитектура

```
parallax/
│
├── parallax.js                ← Главный файл-маршрутизатор (ШЛЮЗ)
├── package.json
├── .env                       ← Ваши токены и ключи
├── .env.example
│
├── data/                      ← БД и сессии (создаётся автоматически)
│   ├── deliveries.db
│   ├── accounting.db
│   └── sessions.json
│
└── modules/
    │
    ├── karnizcal/             ← Расчёт карнизов
    │   └── index.js           ← Полная логика (перенесена из bot.js)
    │
    ├── delivery/              ← Ditry Express
    │   ├── index.js           ← Адаптер (роутер апдейтов)
    │   └── db.js              ← Скопировать из delivery_bot_nodejs/db.js
    │
    ├── accounting/            ← Бухгалтерия
    │   ├── index.js           ← Адаптер (загружает src/ через dynamic import)
    │   └── src/               ← Скопировать из accounting_bot_node/src/
    │       ├── main.js        ← (не запускается, используется как библиотека)
    │       ├── config.js
    │       ├── database.js
    │       ├── states.js
    │       ├── middlewares/
    │       ├── handlers/
    │       ├── keyboards/
    │       └── utils/
    │
    └── smeta/                 ← Сканер смет
        ├── index.js           ← Адаптер
        ├── package.json       ← Скопировать из Smeta-main/package.json
        ├── tsconfig.json      ← Скопировать из Smeta-main/tsconfig.json
        ├── src/               ← Скопировать из Smeta-main/src/
        │   ├── services/
        │   ├── utils/
        │   ├── types/
        │   └── config/
        └── dist/              ← Создаётся после: npx tsc
```

---

## Пошаговая установка

### Шаг 1. Распакуйте архивы

```bash
# Создайте структуру папок
mkdir -p parallax/modules/{karnizcal,delivery,accounting,smeta}
cd parallax

# 1. karnizcal — index.js уже содержит всю логику, ничего копировать не нужно

# 2. delivery — скопируйте только db.js
cp ../delivery_bot_nodejs/db.js modules/delivery/db.js

# 3. accounting — скопируйте всю папку src/
cp -r ../accounting_bot_node/src/ modules/accounting/src/

# 4. smeta — скопируйте src/, tsconfig.json, package.json
cp -r ../Smeta-main/src/        modules/smeta/src/
cp    ../Smeta-main/tsconfig.json modules/smeta/tsconfig.json
cp    ../Smeta-main/package.json  modules/smeta/package-smeta.json
```

### Шаг 2. Настройте .env

```bash
cp .env.example .env
# Откройте .env и заполните:
#   PARALLAX_BOT_TOKEN — токен бота от @BotFather
#   GEMINI_API_KEY     — ключ Gemini API (для Сканера смет)
```

### Шаг 3. Установите зависимости

```bash
# Основные зависимости Parallax
npm install

# Зависимости для модуля Сканер смет (TypeScript)
cd modules/smeta
npm install
npx tsc          # компилируем TS → dist/
cd ../..
```

### Шаг 4. Запустите

```bash
node parallax.js
# или в dev-режиме с автоперезапуском:
npm run dev
```

---

## Как работает маршрутизация

```
Пользователь пишет /start
        │
        ▼
   parallax.js — сбрасывает ctx.session.activeBot = null
        │
        ▼
   Показывает Главное меню (4 кнопки)
        │
   Пользователь нажимает "🧾 Бухгалтерия"
        │
        ▼
   callback_query: "bot:accounting"
        │
        ▼
   ctx.session.activeBot = 'accounting'
   ctx.session.botState  = {}
        │
        ▼
   accounting.onEnter(ctx, returnToMain)
        │
        ▼
   Все следующие апдейты от пользователя
   → bot.use(middleware) → MODULES['accounting'].handleUpdate(ctx, returnToMain)
        │
   Пользователь нажимает "◀️ В главное меню"
   (callback_data: 'parallax:back')
        │
        ▼
   parallax.js перехватывает → returnToMain(ctx)
   ctx.session.activeBot = null
   ctx.session.botState  = {}
        │
        ▼
   Показывает Главное меню
```

---

## Как адаптировать свой модуль

Каждый модуль должен экспортировать две функции:

```javascript
// modules/my_bot/index.js
'use strict';

// Вызывается когда пользователь выбрал этот бот в меню
async function onEnter(ctx, returnToMain) {
  // Сброс внутреннего состояния
  ctx.session.botState = {};
  // Показываем стартовый экран бота
  await ctx.reply('Добро пожаловать в мой бот!');
}

// Вызывается для каждого апдейта пока бот активен
async function handleUpdate(ctx, returnToMain) {
  // Обработка кнопки возврата
  if (ctx.message?.text === '◀️ Главное меню') {
    await returnToMain(ctx);
    return;
  }
  // Вся остальная логика бота...
}

module.exports = { onEnter, handleUpdate };
```

### Хранение состояния

Вместо отдельного `Map<userId, state>` используйте `ctx.session.botState`:

```javascript
// Было (оригинальный бот):
const sessions = new Map();
function session(chatId) {
  if (!sessions.has(chatId)) sessions.set(chatId, {});
  return sessions.get(chatId);
}
const s = session(chatId);
s.state = 'WAITING_INPUT';

// Стало (в адаптере):
ctx.session.botState.state = 'WAITING_INPUT';
// или через хелпер:
function s(ctx) {
  if (!ctx.session.botState) ctx.session.botState = {};
  return ctx.session.botState;
}
s(ctx).state = 'WAITING_INPUT';
```

### Кнопка «Назад»

Добавьте в любую inline-клавиатуру:
```javascript
{ text: '◀️ В главное меню', callback_data: 'parallax:back' }
```

Или в reply-клавиатуру:
```javascript
.text('◀️ Главное меню')
// и в handleUpdate:
if (ctx.message?.text === '◀️ Главное меню') {
  await returnToMain(ctx);
  return;
}
```

---

## Особенности каждого модуля

### karnizcal (Расчёт карнизов)
- ✅ Полностью переписан в `modules/karnizcal/index.js`
- ✅ Нет внешних зависимостей (кроме grammy из parallax)
- ✅ Готов к запуску без дополнительных шагов

### delivery (Ditry Express)
- ⚠️ Требует копирования `db.js`
- ⚠️ В `index.js` перенесена базовая структура; полную логику
  (handleActiveRequests, все FSM-состояния) нужно перенести из
  оригинального `delivery_bot_nodejs/bot.js` по шаблону адаптера

### accounting (Бухгалтерия)
- ⚠️ Требует копирования папки `src/`
- ⚠️ ESM-модули загружаются через динамический `import()`
- ⚠️ Убедитесь, что `accounting_bot_node/src/config.js` читает
  `process.env.BOT_TOKEN` — в Parallax этот токен не нужен модулю,
  поэтому добавьте проверку `if (!BOT_TOKEN) return;` вместо throw

### smeta (Сканер смет)
- ⚠️ Требует компиляции TypeScript: `cd modules/smeta && npx tsc`
- ⚠️ Требует GEMINI_API_KEY в .env
- ⚠️ Убедитесь что `modules/smeta/src/config/env.ts` читает
  `process.env.GEMINI_API_KEY` (а не `TELEGRAM_BOT_TOKEN` для запуска)

---

## Переменные окружения

| Переменная          | Описание                          | Где используется       |
|---------------------|-----------------------------------|------------------------|
| PARALLAX_BOT_TOKEN  | Токен основного бота              | parallax.js            |
| GEMINI_API_KEY      | Ключ Google Gemini API            | modules/smeta          |
| BACKUP_DIR          | Папка для бэкапов БД              | modules/delivery       |
| TZ                  | Timezone для cron                 | modules/delivery, accounting |
