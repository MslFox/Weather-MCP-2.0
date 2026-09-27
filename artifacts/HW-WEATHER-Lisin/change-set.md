HW-WEATHER-Lisin

# Change Set

## Изменённые файлы реализации

- `weather-mcp/src/time.ts`
  - Добавлены helper-функции московского datetime, форматирования и валидации search interval.
  - Добавлена генерация кандидатов от полного часа.

- `weather-mcp/src/open-meteo.ts`
  - Общая логика выбора локации вынесена для старого assess и нового поиска.
  - Добавлен `findSafeWindow`.
  - Успешный поиск использует один geocoding-запрос и один forecast-запрос.
  - Убрано попадание `undefined`-полей в структурированные location/options.

- `weather-mcp/src/index.ts`
  - Зарегистрирован MCP-инструмент `find_safe_weather_window`.
  - Добавлена строгая Zod-схема входа.
  - Добавлен controlled error mapping.

- `weather-mcp/test/safe-weather-window.test.mjs`
  - Добавлены тесты happy path, ранжирования, невалидных интервалов, unknown/ambiguous city и Open-Meteo failure.

- `weather-mcp/test/mcp-health.test.mjs`
  - Обновлены ожидания по числу и списку MCP-инструментов.

- `weather-mcp/test/compare-weather-windows.test.mjs`
  - Обновлены ожидания по списку MCP-инструментов.

- `weather-mcp/README.md`
  - Добавлена документация `find_safe_weather_window`.

## Проверки

- Первый `npm run ci`: неуспешно, выявлены ошибки компиляции/тестов.
- Повторный `npm run ci` после исправлений: успешно, 33/33 теста.
- MCP in-memory examples: успешный поиск и контролируемый ambiguous отказ.

## Не включено

- Реальная проверка через MCP Inspector не запускалась.
- `weather-mcp/package-lock.json` содержит заранее существовавший diff и не является частью функционального изменения.
