"""Transform raw cinema scrape data into the standardized JSON contract."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

from pyetl.chains import CINEMA_CHAINS
from pyetl.text import clean_string, edit_distance
from pyetl.time import (
    iso_datetime_to_ms,
    to_singapore_unix_ms_from_12h,
    to_singapore_unix_ms_from_gv,
    to_singapore_unix_ms_from_text,
)

CinemaData = dict[str, list[dict[str, Any]]]


def _make_cinemas(chain: str, cinemas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{chain}:{cinema.get('id', '')}",
            "name": clean_string(cinema.get("name", "")),
            "searchableName": clean_string(cinema.get("name", "")),
            "source": {
                "chain": chain,
                "id": str(cinema.get("id", "")),
                "details": {"address": cinema.get("address", "")},
            },
        }
        for cinema in cinemas
    ]


def _make_movies(
    chain: str,
    movies: list[dict[str, Any]],
    id_getter: Callable[[dict[str, Any]], str],
    title_getter: Callable[[dict[str, Any]], str],
    language_getter: Callable[[dict[str, Any]], str] | None = None,
    format_getter: Callable[[dict[str, Any]], str] | None = None,
    details_getter: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{chain}:{id_getter(movie)}",
            "filmTitle": clean_string(title_getter(movie)),
            "language": (language_getter(movie) if language_getter else "Unknown") or "Unknown",
            "format": (format_getter(movie) if format_getter else "") or "",
            "source": {
                "chain": chain,
                "id": id_getter(movie),
                "details": details_getter(movie) if details_getter else {},
            },
        }
        for movie in movies
    ]


def transform_chain(chain: str, raw: dict[str, Any]) -> CinemaData:
    transformers = {
        "gv": _transform_gv,
        "shaw": _transform_shaw,
        "carnival": _transform_carnival,
        "eaglewing": _transform_eaglewing,
        "filmhouse": _transform_filmhouse,
        "sfs": _transform_sfs,
    }
    try:
        return transformers[chain](raw)
    except KeyError as exc:
        raise ValueError(f"Unsupported cinema chain: {chain}") from exc


def transform_raw_dir(
    raw_dir: str | Path = "data/raw",
    out_dir: str | Path = "data/intermediate",
    chains: tuple[str, ...] = CINEMA_CHAINS,
) -> CinemaData:
    raw_path = Path(raw_dir)
    output_path = Path(out_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    merged: CinemaData = {"movies": [], "cinemas": [], "showtimes": []}

    for chain in chains:
        raw = json.loads((raw_path / f"{chain}.json").read_text())
        standardized = transform_chain(chain, raw)
        (output_path / f"{chain}.json").write_text(json.dumps(standardized, indent=2), encoding="utf-8")
        merged["movies"].extend(standardized["movies"])
        merged["cinemas"].extend(standardized["cinemas"])
        merged["showtimes"].extend(standardized["showtimes"])

    merged = _clean_movie_list(merged)
    (output_path / "merge.json").write_text(json.dumps(merged, indent=2), encoding="utf-8")
    return merged


def _clean_movie_list(data: CinemaData) -> CinemaData:
    used_movie_ids = {showtime["filmId"] for showtime in data["showtimes"]}
    return {
        "movies": [movie for movie in data["movies"] if movie["id"] in used_movie_ids],
        "cinemas": data["cinemas"],
        "showtimes": data["showtimes"],
    }


def _transform_gv(raw: dict[str, Any]) -> CinemaData:
    cinemas = _gv_map_cinemas(raw.get("cinemas", []))
    movies = _gv_map_movies(raw.get("movies", []))
    showtimes = []
    cinema_by_raw_id = {cinema["id"]: cinema for cinema in cinemas}
    movie_by_raw_id = {movie["id"]: movie for movie in movies}

    for showtime in raw.get("showtimes", []):
        cinema = cinema_by_raw_id.get(f"gv:{showtime.get('cinemaId')}")
        movie = movie_by_raw_id.get(f"gv:{showtime.get('filmCd')}")
        if not cinema or not movie:
            continue

        unix_time = to_singapore_unix_ms_from_gv(
            str(showtime.get("showDate", "")),
            str(showtime.get("time24", "")),
            str(showtime.get("time12", "")),
        )
        cinema_parent = cinema["source"]["details"]["locationCode"]
        film_parent = movie["source"]["details"]["formatGroupParentId"]
        cinema_id = showtime.get("cinemaId", "")
        film_code = showtime.get("filmCd", "")
        show_date = showtime.get("showDate", "")
        time_24 = showtime.get("time24", "")
        hall = showtime.get("hall", "")
        details = movie["source"]["details"]
        showtimes.append(
            {
                "id": f"gv:{cinema_id}/{film_code}/{show_date}/{time_24}/{hall}",
                "cinemaId": f"gv:{cinema_parent}",
                "filmId": f"gv:{film_parent}",
                "unixTime": unix_time,
                "link": (
                    "https://www.gv.com.sg/GVSeatSelection#/"
                    f"cinemaId/{cinema_id}/filmCode/{film_code}/showDate/{show_date}/showTime/{time_24}/hallNumber/{hall}"
                ),
                "ticketType": cinema["source"]["details"]["type"],
                "movieFormat": movie["format"],
                "details": {
                    "priorityBooking": showtime.get("priorityBkgFlg"),
                    "subtitles": showtime.get("subTitles", []),
                    "soldPercent": f"{showtime.get('soldPercent', 0) * 10}%",
                    "hall": hall,
                    "cinemaName": cinema["name"],
                    "movieTitle": movie["filmTitle"],
                    "discounts": {
                        "concessionAllow": showtime.get("concessionAllow"),
                        "freeValidity": details["freeValidity"],
                        "annualPassValidity": details["annualPassValidity"],
                        "eDealsValidity": details["eDealsValidity"],
                        "mPassMovie": details["mPassMovie"],
                    },
                },
            }
        )

    return {
        "movies": [
            movie
            for movie in movies
            if movie["source"]["details"]["formatGroupParentId"] == movie["source"]["id"]
        ],
        "cinemas": [
            cinema
            for cinema in cinemas
            if cinema["source"]["details"]["locationCode"] == cinema["source"]["id"]
        ],
        "showtimes": showtimes,
    }


def _gv_map_movies(movies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def parent_id(format_group_id: Any) -> str:
        for movie in movies:
            if movie.get("formatGroupParent") and movie.get("formatGroupId") == format_group_id:
                return str(movie.get("filmCd", ""))
        return ""

    mapped = []
    for movie in movies:
        film_title = str(movie.get("filmTitle", ""))
        promo = film_title[-5:]
        format_parent_id = (
            str(movie.get("filmCd", ""))
            if movie.get("formatGroupParent")
            else parent_id(movie.get("formatGroupId"))
        )
        mapped.append(
            {
                "id": f"gv:{movie.get('filmCd', '')}",
                "filmTitle": film_title,
                "language": movie.get("language", ""),
                "format": movie.get("formatCode", ""),
                "source": {
                    "chain": "gv",
                    "id": str(movie.get("filmCd", "")),
                    "details": {
                        "subtitle": movie.get("subTitles", []),
                        "formatGroupParentId": format_parent_id,
                        "freeValidity": "*" not in promo,
                        "annualPassValidity": "+" not in promo,
                        "eDealsValidity": "^" not in promo,
                        "mPassMovie": movie.get("mPassMovie", False),
                    },
                },
            }
        )
    return mapped


def _gv_map_cinemas(cinemas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    location_type = {
        "G": "Gold Class",
        "E": "Deluxe Plus",
        "L": "Duo Deluxe",
        "M": "GVMax",
        "C": "Gemini",
        "T": "Standard",
        "U": "Auro 11.1",
        "Cineleisure": "Cineleisure",
    }

    def strip_name(text: str) -> str:
        stripped = text
        for token in (
            "Gold Class Express",
            "Gold Class Grand",
            "Gold Class",
            "Deluxe Plus",
            "Duo Deluxe",
            "GV Grand",
            "GVmax",
            "GV",
        ):
            stripped = stripped.replace(token, "")
        return stripped

    def find_location_code(cinema: dict[str, Any]) -> str:
        cinema_id = str(cinema.get("id", ""))
        location_code = str(cinema.get("locationCode", ""))
        cinema_type = cinema.get("type")
        if cinema_type == "T":
            return location_code
        if location_code != cinema_id:
            return location_code
        stripped = strip_name(str(cinema.get("name", "")))
        for candidate in cinemas:
            candidate_id = str(candidate.get("id", ""))
            candidate_type = candidate.get("type")
            candidate_location_code = str(candidate.get("locationCode", ""))
            if not (candidate_type == "T" and candidate_location_code == candidate_id):
                continue
            if edit_distance(strip_name(str(candidate.get("name", ""))), stripped) < 3:
                return candidate_id
        return location_code

    mapped = []
    for cinema in cinemas:
        cinema_id = str(cinema.get("id", ""))
        cinema_type = str(cinema.get("type", ""))
        type_label = location_type.get(cinema_type, cinema_type)
        type_code = "Cineleisure" if cinema_id == "18" and cinema_type == "T" else cinema_type
        name = clean_string(cinema.get("name", ""))
        mapped.append(
            {
                "id": f"gv:{cinema_id}",
                "name": name,
                "searchableName": name,
                "source": {
                    "chain": "gv",
                    "id": cinema_id,
                    "details": {
                        "sequence": cinema.get("sequence"),
                        "locationCode": find_location_code(cinema),
                        "cinemaCode": cinema.get("cinemaCode"),
                        "type": {"label": type_label, "type": type_code},
                    },
                },
            }
        )
    return mapped


def _transform_shaw(raw: dict[str, Any]) -> CinemaData:
    format_type = {"DGSD": "Digital", "IMSD": "IMAX"}
    ticket_type = {
        "DGTL": "Digital",
        "LUMR": "Lumiere",
        "PREM": "premiere",
        "DREM": "Dreamers",
        "DREMB": "Dreamers Balestier",
        "IMAX": "IMAX",
    }
    format_code = {"DGSD": "Digital", "IMLS": "IMAX", "IMSD": "IMAX Waterway Point"}
    subtitle_code = {"ECSB": ["English", "Chinese"], "ENSB": ["English"], "CHSB": ["Chinese"], "NOSB": []}
    brand_code = {"DGTL": "DGTL", "IMAX": "IMAX"}
    restrictions = {"SNF": "Strictly No Free Tickets", "NF": "No Free Tickets", "NR": "No Restriction"}

    movies = []
    for movie in raw.get("movies", []):
        movie_id = str(movie.get("movieReleaseId", ""))
        movies.append(
            {
                "id": f"shaw:{movie_id}",
                "filmTitle": movie.get("primaryTitle", ""),
                "language": "Unknown",
                "format": format_type.get(movie.get("formatCode"), "Digital"),
                "source": {
                    "chain": "shaw",
                    "id": movie_id,
                    "details": {
                        "isLimited": movie.get("isLimited"),
                        "isNewRelease": movie.get("isNewRelease"),
                        "isExclusive": movie.get("isExclusive"),
                        "isSneakPreview": movie.get("isSneakPreview"),
                        "isAdvanceSales": movie.get("isAdvanceSales"),
                    },
                },
            }
        )

    cinemas = []
    for cinema in raw.get("cinemas", []):
        cinema_id = str(cinema.get("id", ""))
        address = clean_string(cinema.get("address", ""))
        cinemas.append(
            {
                "id": f"shaw:{cinema_id}",
                "name": clean_string(cinema.get("name", "")),
                "searchableName": address,
                "source": {
                    "chain": "shaw",
                    "id": cinema_id,
                    "details": {"address": address, "code": cinema.get("code")},
                },
            }
        )

    movie_set = {movie["filmTitle"]: movie["id"] for movie in movies}
    showtimes = []
    for raw_showtime in raw.get("showtimes", []):
        location_venue_brand_code = raw_showtime.get("locationVenueBrandCode", "")
        ticket_label = ticket_type.get(location_venue_brand_code)
        if location_venue_brand_code == "IMAX":
            location_venue_brand_code = raw_showtime.get("formatCode", "")
            ticket_label = format_code.get(location_venue_brand_code)

        film_id = f"shaw:{raw_showtime.get('movieReleaseId', '')}"
        parent_film_id = movie_set.get(raw_showtime.get("primaryTitle", ""), film_id)
        if not parent_film_id:
            continue
        showtimes.append(
            {
                "id": f"shaw:{raw_showtime.get('performanceId', '')}",
                "filmId": parent_film_id,
                "cinemaId": f"shaw:{raw_showtime.get('locationId', '')}",
                "unixTime": to_singapore_unix_ms_from_12h(
                    str(raw_showtime.get("displayDate", "")),
                    str(raw_showtime.get("displayTime", "")),
                ),
                "link": f"https://shaw.sg/seat-selection/{raw_showtime.get('performanceId', '')}",
                "ticketType": {"label": ticket_label, "type": location_venue_brand_code},
                "movieFormat": brand_code.get(raw_showtime.get("movieBrand")),
                "details": {
                    "subtitles": subtitle_code.get(raw_showtime.get("subtitleCode"), []),
                    "seatingStatus": raw_showtime.get("seatingStatus"),
                    "isMidnight": raw_showtime.get("isMidnight"),
                    "cinemaName": raw_showtime.get("locationVenueName"),
                    "movieTitle": raw_showtime.get("primaryTitle"),
                    "isDtsx": raw_showtime.get("isDtsx"),
                    "discounts": {
                        "restrictionCode": raw_showtime.get("restrictionCode"),
                        "restrictions": restrictions.get(raw_showtime.get("restrictionCode")),
                    },
                },
            }
        )
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def _transform_carnival(raw: dict[str, Any]) -> CinemaData:
    cinemas = _make_cinemas("carnival", raw.get("cinemas", []))
    movies = _make_movies(
        "carnival",
        raw.get("movies", []),
        lambda movie: str(movie.get("code", "")),
        lambda movie: str(movie.get("name", "")),
        lambda movie: str(movie.get("language", "")),
        details_getter=lambda movie: {"genre": movie.get("genre", "")},
    )
    name_to_id = {
        "golden mile": "carnival:golden-mile-tower",
        "shaw tower": "carnival:shaw-tower",
        "punggol": "carnival:punggol",
        "mackenzie": "carnival:rex-mackenzie",
    }

    def resolve_cinema_id(cinema_name: str) -> str:
        lower = cinema_name.lower()
        for key, cinema_id in name_to_id.items():
            if key in lower:
                return cinema_id
        return "carnival:golden-mile-tower"

    def normalize_show_time(show_time: str) -> str:
        match = re.match(r"^(\d{1,2}:\d{2})\s*([AP]M)", show_time.strip(), re.IGNORECASE)
        return f"{match.group(1)} {match.group(2).upper()}" if match else show_time

    showtimes = []
    for showtime in raw.get("showtimes", []):
        for group in showtime.get("groups", []):
            cinema_id = resolve_cinema_id(str(group.get("cinemaName", "")))
            for session in group.get("sessions", []):
                if not session.get("showTime"):
                    continue
                normalized = normalize_show_time(str(session.get("showTime", "")))
                showtimes.append(
                    {
                        "id": f"carnival:{session.get('showId', '')}",
                        "filmId": f"carnival:{showtime.get('movieCode', '')}",
                        "cinemaId": cinema_id,
                        "unixTime": to_singapore_unix_ms_from_12h(str(showtime.get("date", "")), normalized),
                        "link": session.get("bookingLink") or "https://carnivalcinemas.sg/",
                        "ticketType": {"label": session.get("format") or "2D", "type": session.get("format") or "2D"},
                        "movieFormat": session.get("format") or "2D",
                        "details": {
                            "screen": session.get("screen"),
                            "showTime": session.get("showTime"),
                            "normalizedShowTime": normalized,
                            "date": showtime.get("date"),
                        },
                    }
                )
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def _transform_eaglewing(raw: dict[str, Any]) -> CinemaData:
    cinemas = _make_cinemas("eaglewing", raw.get("cinemas", []))
    movies = _make_movies(
        "eaglewing",
        raw.get("movies", []),
        lambda movie: str(movie.get("id", "")),
        lambda movie: str(movie.get("title", "")),
        lambda movie: str(movie.get("language", "")),
        details_getter=lambda movie: {"genre": movie.get("genre", ""), "slug": movie.get("slug", "")},
    )
    showtimes = []
    for showtime in raw.get("showtimes", []):
        for session in showtime.get("sessions", []):
            if not session.get("time"):
                continue
            date = session.get("date") or showtime.get("date")
            showtimes.append(
                {
                    "id": f"eaglewing:{session.get('id', '')}",
                    "filmId": f"eaglewing:{showtime.get('movieId', '')}",
                    "cinemaId": "eaglewing:1",
                    "unixTime": to_singapore_unix_ms_from_12h(str(date), str(session.get("time", ""))),
                    "link": session.get("bookingUrl") or "https://www.eaglewingscinematics.com.sg/",
                    "ticketType": {"label": session.get("format") or "2D", "type": session.get("format") or "2D"},
                    "movieFormat": session.get("format") or "2D",
                    "details": {"screen": session.get("hall"), "showTime": session.get("time"), "date": date},
                }
            )
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def _parse_filmhouse_format(attributes: list[str]) -> str:
    if not attributes:
        return "2D"
    joined = " ".join(attributes).upper()
    if "4DX" in joined:
        return "4DX"
    if "IMAX" in joined:
        return "IMAX"
    if "3D" in joined:
        return "3D"
    if "DOLBY" in joined:
        return "Dolby"
    return attributes[0] or "2D"


def _transform_filmhouse(raw: dict[str, Any]) -> CinemaData:
    cinemas = _make_cinemas("filmhouse", raw.get("cinemas", []))
    movies = _make_movies(
        "filmhouse",
        raw.get("movies", []),
        lambda movie: str(movie.get("id", "")),
        lambda movie: str(movie.get("title", "")),
        lambda movie: str(movie.get("language", "")),
        details_getter=lambda movie: {"genre": movie.get("genre", "")},
    )
    showtimes = []
    for session in raw.get("showtimes", []):
        if not session.get("startTime") or not session.get("filmId"):
            continue
        show_format = _parse_filmhouse_format(session.get("attributes", []))
        showtimes.append(
            {
                "id": f"filmhouse:{session.get('id', '')}",
                "filmId": f"filmhouse:{session.get('filmId', '')}",
                "cinemaId": "filmhouse:1",
                "unixTime": iso_datetime_to_ms(str(session.get("startTime", ""))),
                "link": session.get("bookingUrl") or "https://filmhouse.com.sg/",
                "ticketType": {"label": show_format, "type": show_format},
                "movieFormat": show_format,
                "details": {
                    "screen": session.get("screenName"),
                    "showTime": session.get("startTime"),
                    "screenId": session.get("screenId"),
                },
            }
        )
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def _transform_sfs(raw: dict[str, Any]) -> CinemaData:
    cinemas = _make_cinemas("sfs", raw.get("cinemas", []))
    movies = _make_movies(
        "sfs",
        raw.get("movies", []),
        lambda movie: str(movie.get("id", "")),
        lambda movie: str(movie.get("title", "")),
        lambda movie: str(movie.get("language", "")),
        details_getter=lambda movie: {"genre": movie.get("genre", "")},
    )
    showtimes = []
    for showtime in raw.get("showtimes", []):
        if not showtime.get("date") or not showtime.get("time"):
            continue
        time_text = str(showtime.get("time", ""))
        numeric_time = re.sub(r"[^0-9]", "", time_text)
        showtimes.append(
            {
                "id": f"sfs:{showtime.get('movieId', '')}-{showtime.get('date', '')}-{numeric_time}",
                "filmId": f"sfs:{showtime.get('movieId', '')}",
                "cinemaId": "sfs:1",
                "unixTime": to_singapore_unix_ms_from_text(str(showtime.get("date", "")), time_text),
                "link": showtime.get("peatixUrl") or "https://www.sfs-somerset.com/",
                "ticketType": {"label": "2D", "type": "2D"},
                "movieFormat": "2D",
                "details": {
                    "showTime": showtime.get("time"),
                    "date": showtime.get("date"),
                    "endTime": showtime.get("endTime"),
                },
            }
        )
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}
