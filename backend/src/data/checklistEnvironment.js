import { SearchMoonQuarter, NextMoonQuarter } from 'astronomy-engine'
import { requireMember } from './postgres.js'

const DAY = 86400000
export function ignoreTemporalRestrictions(env={}) {
  return env.ignorarRestriccionesTemporales===true
    || (process.env.CHECKLIST_IGNORE_TIME_RESTRICTIONS==='true'&&process.env.NODE_ENV!=='production')
}
export function localDate(value, zone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const get = key => parts.find(p => p.type === key).value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export function daysBetween(start, end, zone) {
  return Math.round((Date.parse(localDate(end,zone)) - Date.parse(localDate(start,zone))) / DAY)
}
export function localMinutes(value, zone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value))
  return Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value)
}
export function lunarWindow(now, zone, quarters) {
  let event = SearchMoonQuarter(new Date(new Date(now).getTime() - 4 * DAY))
  for (let i = 0; i < 3; i++, event = NextMoonQuarter(event)) {
    if (quarters.includes(event.quarter) && Math.abs(daysBetween(event.time.date,now,zone)) <= 1) return true
  }
  return false
}
export function nextLunarEventDate(now, zone, quarters, notBefore = now) {
  const earliest=localDate(notBefore,zone)
  let event=SearchMoonQuarter(new Date(new Date(now).getTime()-4*DAY))
  for(let i=0;i<16;i++,event=NextMoonQuarter(event)) {
    if(quarters.includes(event.quarter)) {
      const date=localDate(event.time.date,zone)
      if(date>=earliest)return date
    }
  }
  return null
}
export function catalogDays(cycle) {
  const match = String(cycle || '').match(/(?:^|\D)(\d+)(?:\s*[-–]\s*(\d+))?\s*d[ií]as\b/i)
  return match ? Number(match[2] || match[1]) : null
}

const weatherCache = new Map()
const weatherFailures = new Map()
export async function weatherAt(lat, lon) {
  const key = `${lat},${lon}`
  const cached = weatherCache.get(key)
  if (cached && cached.until > Date.now()) return cached.promise
  if ((weatherFailures.get(key)||0)>Date.now()) throw new Error('CLIMA_NO_DISPONIBLE')
  const promise = (async () => {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon),
      current: 'weather_code,precipitation,is_day,temperature_2m', daily: 'sunrise', forecast_days: '1',
      timezone: 'auto', timeformat: 'unixtime' }).toString()
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('CLIMA_NO_DISPONIBLE')
    const result = await response.json()
    return { zonaHoraria: result.timezone, codigo: result.current?.weather_code,
      temperatura: result.current?.temperature_2m,
      precipitacion: result.current?.precipitation, esDia: result.current?.is_day,
      observadaEn: result.current?.time ? new Date(result.current.time * 1000) : null,
      amanecer: result.daily?.sunrise?.[0] ? new Date(result.daily.sunrise[0] * 1000) : null }
  })()
  if (weatherCache.size > 100) weatherCache.delete(weatherCache.keys().next().value)
  weatherCache.set(key, { until: Date.now() + 5 * 60000, promise })
  try {
    const result=await promise
    weatherFailures.delete(key)
    return result
  } catch (error) {
    weatherCache.delete(key)
    weatherFailures.set(key,Date.now()+30_000)
    if(weatherFailures.size>100)weatherFailures.delete(weatherFailures.keys().next().value)
    throw error
  }
}

export function sunny(env) {
  return env.clima && [0,1].includes(env.clima.codigo) && env.clima.precipitacion === 0
    && env.clima.esDia === 1 && env.clima.observadaEn
    && Math.abs(new Date(env.ahora) - new Date(env.clima.observadaEn)) <= 30 * 60000
}

export async function loadEnvironment(db, user, garden) {
  await requireMember(db,user,garden)
  const row = (await db.query(`SELECT g.latitud,g.longitud,c.zona_horaria FROM huerto h
    JOIN gremio g USING(id_gremio) LEFT JOIN checklist_configuracion c USING(id_huerto) WHERE h.id_huerto=$1`, [garden])).rows[0]
  let clima = null
  if(!ignoreTemporalRestrictions()) {
    try { clima = await weatherAt(Number(row.latitud),Number(row.longitud)) } catch { /* No se inventa clima soleado. */ }
  }
  const zone = row.zona_horaria || clima?.zonaHoraria || null
  return { ahora: new Date(), zonaHoraria: zone, clima, amanecer: clima?.amanecer || null }
}
