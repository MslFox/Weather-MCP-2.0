const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_FORECAST_MS = 5 * 24 * HOUR_MS;

export class InputError extends Error {}

export interface WorkPeriod {
  start: Date;
  end: Date;
}

function parseMoscowDateTime(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new InputError("Дата и время должны иметь формат YYYY-MM-DDTHH:mm по МСК.");
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const localAsUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    localAsUtc.getUTCFullYear() !== year ||
    localAsUtc.getUTCMonth() !== month - 1 ||
    localAsUtc.getUTCDate() !== day ||
    localAsUtc.getUTCHours() !== hour ||
    localAsUtc.getUTCMinutes() !== minute
  ) {
    throw new InputError("Указана несуществующая дата или время.");
  }
  return new Date(localAsUtc.getTime() - MOSCOW_OFFSET_MS);
}

export function formatMoscowDateTime(date: Date): string {
  return new Date(date.getTime() + MOSCOW_OFFSET_MS).toISOString().slice(0, 16);
}

export function parseWorkPeriod(startAt: string, durationHours: number, now = new Date()): WorkPeriod {
  const start = parseMoscowDateTime(startAt);
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new InputError("Продолжительность должна быть положительным числом часов.");
  }

  const end = new Date(start.getTime() + durationHours * HOUR_MS);
  if (!Number.isFinite(end.getTime()) || end.getTime() <= start.getTime()) {
    throw new InputError("Продолжительность работ слишком мала для оценки прогноза.");
  }
  if (start.getTime() < now.getTime()) {
    throw new InputError("Начало работ должно быть не раньше текущего момента.");
  }
  if (end.getTime() > now.getTime() + MAX_FORECAST_MS) {
    throw new InputError("Работы должны завершиться не позднее пяти суток от текущего момента.");
  }
  return { start, end };
}

export function parseSearchInterval(
  searchStart: string,
  searchEnd: string,
  durationHours: number,
  now = new Date()
): { search: WorkPeriod; candidates: WorkPeriod[] } {
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 8) {
    throw new InputError("Продолжительность окна должна быть целым числом от 1 до 8 часов.");
  }

  const start = parseMoscowDateTime(searchStart);
  const end = parseMoscowDateTime(searchEnd);
  if (end.getTime() <= start.getTime()) {
    throw new InputError("Конец интервала поиска должен быть позже начала.");
  }
  if (start.getTime() < now.getTime()) {
    throw new InputError("Интервал поиска должен начинаться не раньше текущего момента.");
  }
  if (end.getTime() > now.getTime() + MAX_FORECAST_MS) {
    throw new InputError("Интервал поиска должен завершиться не позднее пяти суток от текущего момента.");
  }

  const durationMs = durationHours * HOUR_MS;
  const firstStart = Math.ceil(start.getTime() / HOUR_MS) * HOUR_MS;
  const candidates: WorkPeriod[] = [];
  for (let timestamp = firstStart; timestamp + durationMs <= end.getTime(); timestamp += HOUR_MS) {
    candidates.push({ start: new Date(timestamp), end: new Date(timestamp + durationMs) });
  }
  if (candidates.length === 0) {
    throw new InputError("В заданном интервале нет полного окна подходящей продолжительности.");
  }

  return { search: { start, end }, candidates };
}

export function intersectsHour(hourStart: Date, period: WorkPeriod): boolean {
  return hourStart.getTime() < period.end.getTime() && hourStart.getTime() + HOUR_MS > period.start.getTime();
}
