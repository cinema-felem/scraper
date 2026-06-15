"""Singapore timestamp helpers."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

SGT = timezone(timedelta(hours=8))

MONTH_ABBR_TO_NUM = {
    "jan": "01",
    "feb": "02",
    "mar": "03",
    "apr": "04",
    "may": "05",
    "jun": "06",
    "jul": "07",
    "aug": "08",
    "sep": "09",
    "oct": "10",
    "nov": "11",
    "dec": "12",
}


def _to_ms(value: datetime) -> int:
    return int(value.timestamp() * 1000)


def to_singapore_unix_ms(iso_date: str, time_24_hhmm: str) -> int:
    parsed = datetime.fromisoformat(f"{iso_date}T{time_24_hhmm}:00+08:00")
    return _to_ms(parsed)


def to_singapore_unix_ms_from_12h(iso_date: str, time_12: str) -> int:
    upper = time_12.upper().strip()
    period = "AM" if upper.endswith("AM") else "PM" if upper.endswith("PM") else None
    time_part = upper[:-2].strip() if period else upper
    hour_text, minute_text = (time_part.split(":", 1) + ["00"])[:2]
    hours = int(hour_text)
    minutes = int(minute_text)
    if period == "PM" and hours != 12:
        hours += 12
    if period == "AM" and hours == 12:
        hours = 0
    return to_singapore_unix_ms(iso_date, f"{hours:02d}:{minutes:02d}")


def to_singapore_unix_ms_from_gv(show_date: str, time_24: str, time_12: str) -> int:
    if not re.match(r"^(2[0-3]|[01]\d)[0-5]\d$", time_24):
        match = re.search(r"(\d{1,2}):(\d{2})(AM|PM)", time_12)
        if not match:
            raise ValueError(f"Invalid GV time: {time_12}")
        hours = int(match.group(1))
        minutes = match.group(2)
        period = match.group(3)
        if period == "PM" and hours != 12:
            hours += 12
        if period == "AM" and hours == 12:
            hours = 0
        time_24 = f"{hours:02d}{minutes}"

    day, month, year = show_date.split("-")
    return to_singapore_unix_ms(f"{year}-{month}-{day}", f"{time_24[:2]}:{time_24[2:4]}")


def to_singapore_unix_ms_from_text(date: str, time: str) -> int:
    if not date or not time:
        return 0
    if "T" in date or "+" in date:
        return _to_ms(datetime.fromisoformat(date.replace("Z", "+00:00")))

    iso_date = date
    match = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", date)
    if match:
        month = MONTH_ABBR_TO_NUM.get(match.group(2).lower()[:3])
        if month:
            iso_date = f"{match.group(3)}-{month}-{int(match.group(1)):02d}"
    return to_singapore_unix_ms_from_12h(iso_date, time)


def iso_datetime_to_ms(value: str) -> int:
    return _to_ms(datetime.fromisoformat(value.replace("Z", "+00:00")))

