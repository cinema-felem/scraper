export function toSingaporeUnixMs(isoDate: string, time24hhmm: string): number {
  // isoDate: "YYYY-MM-DD", time24hhmm: "HH:MM"
  const jsDate = new Date(`${isoDate}T${time24hhmm}:00+08:00`)
  if (isNaN(jsDate.getTime()))
    throw new Error(`Invalid date/time: ${isoDate} ${time24hhmm}`)
  return jsDate.getTime()
}

export const MONTH_ABBR_TO_NUM: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

// "H:MM AM", "H:MMPM", or plain 24h "HH:MM" → Singapore Unix ms
export function toSingaporeUnixMsFrom12h(isoDate: string, time12: string): number {
  const upper = time12.toUpperCase().trim()
  const period = upper.endsWith('AM') ? 'AM' : upper.endsWith('PM') ? 'PM' : null
  const timePart = period ? upper.slice(0, -2).trim() : upper
  const [h, m] = timePart.split(':')
  let hours = parseInt(h, 10)
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return toSingaporeUnixMs(isoDate, `${String(hours).padStart(2, '0')}:${(m || '00').padStart(2, '0')}`)
}

// GV-specific: showDate is "DD-MM-YYYY", time24 is "HHMM" (may be invalid), time12 is "H:MMAM/PM" fallback
export function toSingaporeUnixMsFromGv(showDate: string, time24: string, time12: string): number {
  if (!/^(2[0-3]|[01]\d)[0-5]\d$/.test(time24)) {
    const match = time12.match(/(\d{1,2}):(\d{2})(AM|PM)/)
    if (!match) throw new Error(`Invalid GV time: ${time12}`)
    const [, h, min, period] = match
    let hour = parseInt(h, 10)
    if (period === 'PM' && hour !== 12) hour += 12
    if (period === 'AM' && hour === 12) hour = 0
    time24 = `${String(hour).padStart(2, '0')}${min}`
  }
  const [dd, mm, yyyy] = showDate.split('-')
  return toSingaporeUnixMs(`${yyyy}-${mm}-${dd}`, `${time24.substring(0, 2)}:${time24.substring(2, 4)}`)
}

// Handles ISO datetime strings, "DD Mon YYYY" text dates, or plain "YYYY-MM-DD" ISO dates with 12h/24h time
export function toSingaporeUnixMsFromText(date: string, time: string): number {
  if (!date || !time) return 0
  if (date.includes('T') || date.includes('+')) return new Date(date).getTime()

  let isoDate = date
  const textDateMatch = date.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (textDateMatch) {
    const day = textDateMatch[1].padStart(2, '0')
    const month = MONTH_ABBR_TO_NUM[textDateMatch[2].toLowerCase().slice(0, 3)]
    if (month) isoDate = `${textDateMatch[3]}-${month}-${day}`
  }

  return toSingaporeUnixMsFrom12h(isoDate, time)
}
