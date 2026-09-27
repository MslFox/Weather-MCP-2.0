HW-WEATHER-Lisin

# Карта репозитория

## Форма проекта

`weather-mcp` — TypeScript MCP-сервер на Node.js 20, работающий через STDIO. Инструменты создаются через `createServer` в `weather-mcp/src/index.ts`; данные геокодирования и погоды приходят из Open-Meteo; тесты используют MCP in-memory transport.

## Основные файлы

- `weather-mcp/src/index.ts`
  - Создаёт MCP-сервер.
  - Регистрирует `get_weather`, `assess_weather_risk` и `compare_weather_windows`.
  - Содержит старый daily forecast flow для `get_weather`.
  - Принимает `riskService` и `weatherDependencies` для тестов.

- `weather-mcp/src/open-meteo.ts`
  - Определяет `OpenMeteoRiskService`, `RiskRequest`, `RiskResult`, `WeatherDataError` и `WEATHER_UNAVAILABLE_MESSAGE`.
  - Содержит парсинг геокодирования, парсинг hourly-прогноза, обработку неоднозначности, кеширование и оркестрацию оценки риска.
  - `parseLocations` и `parseForecast` сейчас являются приватными helper-функциями.

- `weather-mcp/src/risk.ts`
  - Центральное место для порогов риска и рекомендаций.
  - `assessRisk(hours)` возвращает `risk_level`, `recommendation` и `factors`.
  - Этот файл должен остаться единственным источником порогов риска.

- `weather-mcp/src/time.ts`
  - Преобразует московский `start_at` в UTC `WorkPeriod`.
  - Проверяет будущий период и пятидневное ограничение для одного периода работ.
  - Сейчас допускает положительную дробную длительность; новый инструмент должен добавить более строгую проверку целого числа без поломки существующих инструментов.

- `weather-mcp/src/cache.ts`
  - Нормализация городов и TTL-кеш в памяти.

- `weather-mcp/test/*.test.mjs`
  - Тесты на Node test runner.
  - `mcp-health.test.mjs` проверяет MCP-экспорт, совместимость `get_weather` и ошибки.
  - `compare-weather-windows.test.mjs` проверяет ранжирование, валидацию входа и кеш для compare-инструмента.
  - `open-meteo.test.mjs` проверяет геокодирование, парсинг прогноза, кеш и ошибки на уровне сервиса.
  - `risk-time.test.mjs` проверяет пороги риска и парсинг времени.

## Текущие контракты

- `get_weather` возвращает текущий/дневной прогноз или контролируемую MCP-ошибку.
- `assess_weather_risk` возвращает `RiskResult`; `isError` истинно для `not_found` и `ambiguous`.
- `compare_weather_windows` принимает ровно два окна и сравнивает только `risk_level`; равный риск считается ничьёй.

## Точки переиспользования для нового инструмента

- Использовать `assessRisk` из `risk.ts` для каждого кандидата.
- Переиспользовать очистку и нормализацию города из `cache.ts`.
- Переиспользовать `WeatherDataError` и `WEATHER_UNAVAILABLE_MESSAGE` для контролируемых внешних сбоев.
- Извлечь или добавить общие helper-функции в `open-meteo.ts`, чтобы геокодирование и единичная загрузка hourly-прогноза обслуживали и текущую оценку риска, и новый search-инструмент.

## Замечание по текущему состоянию

В `weather-mcp/package-lock.json` есть заранее существовавший незакоммиченный diff по метаданным `peer`. Эта задача планирования его не изменяет.
