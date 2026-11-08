// Aproximación astronómica basada en el mes sinódico medio (Meeus).
// Sirve para reglas de calendario; no sustituye observación astronómica local.
const NEW_MOON_EPOCH = Date.parse('2000-01-06T18:14:00Z')
export const SYNODIC_MONTH_DAYS = 29.530588853

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

export function lunarAgeDays(date = new Date()) {
  return modulo((date.getTime() - NEW_MOON_EPOCH) / 86_400_000, SYNODIC_MONTH_DAYS)
}

export function daysUntilLunarAge(targetAge, date = new Date()) {
  return modulo(targetAge - lunarAgeDays(date), SYNODIC_MONTH_DAYS)
}

export function lunarPhase(date = new Date()) {
  const age = lunarAgeDays(date)
  if (age < 1.85 || age >= 27.68) return 'luna_nueva'
  if (age < 5.54) return 'creciente'
  if (age < 9.22) return 'cuarto_creciente'
  if (age < 12.91) return 'gibosa_creciente'
  if (age < 16.61) return 'llena'
  if (age < 20.30) return 'gibosa_menguante'
  if (age < 23.99) return 'cuarto_menguante'
  return 'menguante'
}

export function nextLunarEvent(date = new Date()) {
  const events = [
    { age: 7.382, phase: 'cuarto_creciente' },
    { age: 14.765, phase: 'llena' },
    { age: 22.148, phase: 'cuarto_menguante' },
    { age: 0, phase: 'luna_nueva' },
  ]
  return events.map((event) => ({ ...event, dias: daysUntilLunarAge(event.age, date) }))
    .sort((a, b) => a.dias - b.dias)[0]
}
