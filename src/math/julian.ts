/**
 * Julian Day calculation with support for both Julian and Gregorian calendars.
 */
export function calendarToJD(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const isGregorian = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  
  let B = 0;
  if (isGregorian) {
    const A = Math.floor(y / 100);
    B = 2 - A + Math.floor(A / 4);
  }

  const jd0 = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  const frac = (hour + minute / 60 + second / 3600) / 24;
  
  return jd0 + frac;
}

/**
 * Convert Julian Day back to calendar date.
 */
export function jdToCalendar(jd: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const jdInt = Math.floor(jd + 0.5);
  const fraction = jd + 0.5 - jdInt;

  let A: number;
  if (jdInt < 2299161) {
    A = jdInt;
  } else {
    const alpha = Math.floor((jdInt - 1867216.25) / 36524.25);
    A = jdInt + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const dayWithFraction = B - D - Math.floor(30.6001 * E) + fraction;
  const day = Math.floor(dayWithFraction);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const totalSeconds = Math.round((dayWithFraction - day) * 86400);
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  return { year, month, day, hour, minute, second };
}
