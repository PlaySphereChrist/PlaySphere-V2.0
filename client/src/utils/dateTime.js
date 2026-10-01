const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDisplayDate(value) {
  if (!value) return null;

  const match = typeof value === 'string' && value.match(DATE_ONLY_PATTERN);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, options) {
  const date = parseDisplayDate(value);
  return date ? date.toLocaleDateString(undefined, options) : '';
}

export function formatDateTime(value, options) {
  const date = parseDisplayDate(value);
  return date ? date.toLocaleString(undefined, options) : '';
}

export function formatTime(value, options) {
  const date = parseDisplayDate(value);
  return date ? date.toLocaleTimeString(undefined, options) : '';
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function toDateInputValue(value) {
  const date = parseDisplayDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(value) {
  const date = parseDisplayDate(value);
  if (!date) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateTimeLocal(value) {
  const date = parseDisplayDate(value);
  if (!date) return '';
  return `${toDateInputValue(date)}T${toTimeInputValue(date)}`;
}

export function localDateTimeToISOString(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
