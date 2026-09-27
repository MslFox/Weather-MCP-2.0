HW-WEATHER-Lisin

# План реализации v1

## Краткое описание

Добавить `find_safe_weather_window`, расширив существующий путь risk-service: один раз определить город, одним запросом получить UTC hourly-прогноз для всего интервала поиска, построить почасовые кандидаты по Москве, оценить каждого кандидата через `assessRisk` и вернуть лучшего кандидата вместе с максимум тремя альтернативами.

## Предлагаемая форма ответа

```json
{
  "kind": "safe_weather_window",
  "location": {
    "city": "Dubai",
    "region": null,
    "country": "United Arab Emirates",
    "timezone": "Asia/Dubai"
  },
  "query": {
    "work_type": "maintenance",
    "search_start": "2026-09-28T08:00",
    "search_end": "2026-09-28T18:00",
    "duration_hours": 3,
    "input_timezone": "Europe/Moscow"
  },
  "selected_window": {
    "start_at": "2026-09-28T09:00",
    "end_at": "2026-09-28T12:00",
    "period": {
      "start_utc": "2026-09-28T06:00:00.000Z",
      "end_utc": "2026-09-28T09:00:00.000Z"
    },
    "risk_level": "LOW",
    "recommendation": "PROCEED",
    "factors": []
  },
  "alternatives": [],
  "checked_candidates": 8,
  "source": "Open-Meteo",
  "fetched_at": "2026-09-27T12:00:00.000Z"
}
```

## Шаги

1. Добавить валидацию интервала поиска отдельно от существующего `parseWorkPeriod`.
2. Извлечь переиспользуемые helper-функции геокодирования и hourly-прогноза из `open-meteo.ts`.
3. Добавить метод сервиса, который определяет город, загружает один прогноз для интервала поиска, строит кандидатов, оценивает риск и ранжирует результаты.
4. Зарегистрировать `find_safe_weather_window` в `index.ts` со строгой Zod-схемой.
5. Добавить MCP-тесты для успешного сценария, ранжирования, невалидных входов, неизвестного/неоднозначного города, сбоев Open-Meteo и совместимости старых инструментов.
6. Обновить README.

## Проверка

- Запустить `npm run ci`.
- После реализации вручную вызвать новый инструмент через MCP Inspector или подключённый Codex.
