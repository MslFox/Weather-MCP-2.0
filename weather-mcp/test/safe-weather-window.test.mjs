import assert from 'node:assert/strict';
import test from 'node:test';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createServer } from '../src/index.ts';
import { OpenMeteoRiskService } from '../src/open-meteo.ts';

const fixedNow = new Date('2026-09-23T12:00:00.000Z');
const fixedClock = () => new Date(fixedNow);
const location = { id: 1, name: 'Dubai', country: 'United Arab Emirates', timezone: 'Asia/Dubai', latitude: 25.2, longitude: 55.3 };
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });
const hourlyForecast = (rows) => ({
  timezone: 'GMT',
  utc_offset_seconds: 0,
  hourly_units: { wind_speed_10m: 'm/s' },
  hourly: {
    time: rows.map(([time]) => time),
    temperature_2m: rows.map(([, temperature]) => temperature),
    precipitation_probability: rows.map(([, , precipitation]) => precipitation),
    wind_speed_10m: rows.map(([, , , wind]) => wind)
  }
});

async function withClient(fetchMock, check) {
  const service = new OpenMeteoRiskService(fetchMock, fixedClock);
  const server = createServer(service, { now: fixedClock, fetchImpl: fetchMock });
  const client = new Client({ name: 'safe-weather-window-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await check(client);
  } finally {
    await client.close();
    await server.close();
  }
}

const validArguments = {
  city: 'Dubai, United Arab Emirates',
  work_type: 'maintenance',
  search_start: '2026-09-23T16:15',
  search_end: '2026-09-23T20:00',
  duration_hours: 1
};

test('find_safe_weather_window ranks by risk, factor count and earlier full-hour candidate', async () => {
  const urls = [];
  const forecast = hourlyForecast([
    ['2026-09-23T13:00', 20, 10, 3],
    ['2026-09-23T14:00', 20, 40, 3],
    ['2026-09-23T15:00', 20, 40, 10],
    ['2026-09-23T16:00', 20, 10, 3]
  ]);
  await withClient(async (url) => {
    urls.push(url.toString());
    return jsonResponse(url.hostname.startsWith('geocoding') ? { results: [location] } : forecast);
  }, async (client) => {
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(({ name }) => name).sort(), [
      'assess_weather_risk',
      'compare_weather_windows',
      'find_safe_weather_window',
      'get_weather'
    ]);
    const result = await client.callTool({ name: 'find_safe_weather_window', arguments: validArguments });
    assert.equal(result.isError, false);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    assert.equal(result.structuredContent.kind, 'safe_weather_window');
    assert.equal(result.structuredContent.checked_candidates, 3);
    assert.equal(result.structuredContent.source, 'Open-Meteo');
    assert.equal(result.structuredContent.location.city, 'Dubai');
    assert.equal(result.structuredContent.selected_window.start_at, '2026-09-23T19:00');
    assert.equal(result.structuredContent.selected_window.end_at, '2026-09-23T20:00');
    assert.equal(result.structuredContent.selected_window.risk_level, 'LOW');
    assert.deepEqual(result.structuredContent.alternatives.map((window) => [window.start_at, window.risk_level, window.factors.length]), [
      ['2026-09-23T17:00', 'MEDIUM', 1],
      ['2026-09-23T18:00', 'MEDIUM', 2]
    ]);
  });
  assert.equal(urls.length, 2);
  assert.ok(urls[0].includes('geocoding-api.open-meteo.com'));
  assert.ok(urls[1].includes('api.open-meteo.com'));
});

test('find_safe_weather_window rejects invalid intervals before fetching', async () => {
  let calls = 0;
  await withClient(async () => {
    calls++;
    throw new Error('must not fetch');
  }, async (client) => {
    const invalidCases = [
      { ...validArguments, search_start: '2026-09-23T14:59' },
      { ...validArguments, search_start: '2026-09-23T16:00', search_end: '2026-09-23T16:00' },
      { ...validArguments, search_start: '2026-09-28T14:00', search_end: '2026-09-28T16:00' },
      { ...validArguments, search_start: '2026-02-30T16:00' },
      { ...validArguments, search_start: '2026-09-23T16:15', search_end: '2026-09-23T16:30' },
      { ...validArguments, duration_hours: 1.5 },
      { ...validArguments, duration_hours: 9 }
    ];
    for (const input of invalidCases) {
      const result = await client.callTool({ name: 'find_safe_weather_window', arguments: input });
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
    }
  });
  assert.equal(calls, 0);
});

test('find_safe_weather_window returns location errors without forecast requests', async () => {
  for (const geocoding of [
    {},
    { results: [{ ...location, id: 1 }, { ...location, id: 2 }] }
  ]) {
    let calls = 0;
    await withClient(async () => {
      calls++;
      return jsonResponse(geocoding);
    }, async (client) => {
      const result = await client.callTool({ name: 'find_safe_weather_window', arguments: validArguments });
      assert.equal(result.isError, true);
      assert.ok(['not_found', 'ambiguous'].includes(result.structuredContent.kind));
      assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    });
    assert.equal(calls, 1);
  }
});

test('find_safe_weather_window maps Open-Meteo failures to controlled MCP errors', async () => {
  let calls = 0;
  await withClient(async (url) => {
    calls++;
    return url.hostname.startsWith('geocoding')
      ? jsonResponse({ results: [location] })
      : jsonResponse({}, 503);
  }, async (client) => {
    const result = await client.callTool({ name: 'find_safe_weather_window', arguments: validArguments });
    assert.equal(result.isError, true);
    assert.equal(result.content[0].text, 'Погодный сервис временно недоступен. Попробуйте позже.');
    assert.equal(result.structuredContent, undefined);
  });
  assert.equal(calls, 2);
});
