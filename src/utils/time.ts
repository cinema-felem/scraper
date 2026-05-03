export function toSingaporeUnixMs(isoDate: string, time24hhmm: string): number {
  // isoDate: "YYYY-MM-DD", time24hhmm: "HH:MM"
  const jsDate = new Date(`${isoDate}T${time24hhmm}:00+08:00`)
  if (isNaN(jsDate.getTime()))
    throw new Error(`Invalid date/time: ${isoDate} ${time24hhmm}`)
  return jsDate.getTime()
}
