HW-WEATHER-Lisin

# Пакет контекста для Builder

## Входные данные

- Задача: `HW-WEATHER-Lisin`
- Источник требований: `ЗАДАНИЕ.md`
- Проект: `weather-mcp`
- Текущая ветка: `weather-mcp-2.0`

## Файлы, которые нужно прочитать перед реализацией

- `weather-mcp/src/index.ts`
- `weather-mcp/src/open-meteo.ts`
- `weather-mcp/src/risk.ts`
- `weather-mcp/src/time.ts`
- `weather-mcp/src/cache.ts`
- `weather-mcp/test/compare-weather-windows.test.mjs`
- `weather-mcp/test/mcp-health.test.mjs`
- `weather-mcp/test/open-meteo.test.mjs`
- `weather-mcp/test/risk-time.test.mjs`
- `weather-mcp/README.md`

## Принятые решения

- Реализовать один новый MCP-инструмент: `find_safe_weather_window`.
- Сохранить поведение старых инструментов.
- Централизовать оценку риска через `assessRisk`.
- Загружать один hourly-прогноз для всего интервала поиска и строить кандидатов локально.
- Ранжировать по уровню риска, количеству факторов, затем времени старта.

## Ограничения

- Не менять исходный код до одобрения `implementation-plan-v2.md`.
- Не смешивать несвязанные изменения `package-lock.json` с реализацией, если отдельная операция с зависимостями позже не сделает это неизбежным.
