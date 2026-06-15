"""Extract raw cinema data from the six supported cinema sources."""

from __future__ import annotations

import base64
import hmac
import html
import json
import re
import ssl
import time
from datetime import date, datetime, timedelta
from datetime import time as datetime_time
from hashlib import sha256
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlencode
from urllib.request import Request, urlopen

from pyetl.chains import CINEMA_CHAINS
from pyetl.time import SGT

JsonObject = dict[str, Any]

_SSL_CONTEXT = ssl._create_unverified_context()  # noqa: S323  # nosec B323


def _request_text(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: int = 45,
) -> tuple[str, Any]:
    request_headers = {**build_default_headers(), **(headers or {})}
    request = Request(url, method=method, headers=request_headers, data=body)
    with urlopen(  # noqa: S310  # nosec B310
        request,
        timeout=timeout,
        context=_SSL_CONTEXT,
    ) as response:
        return response.read().decode("utf-8", errors="replace"), response.headers


def _request_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> Any:
    text, _ = _request_text(url, method=method, headers=headers, body=body)
    if text.lstrip().startswith("<"):
        raise RuntimeError(f"{url} returned HTML instead of JSON")
    return json.loads(text)


def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str]) -> Any:
    request_headers = {"content-type": "application/json", **headers}
    return _request_json(url, method="POST", headers=request_headers, body=json.dumps(payload).encode("utf-8"))


def build_default_headers() -> dict[str, str]:
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
    }


def _today_sgt() -> date:
    return datetime.now(SGT).date()


def _midnight_epoch_ms(day: date) -> int:
    return int(datetime.combine(day, datetime_time.min, tzinfo=SGT).timestamp() * 1000)


def scrape_chain(chain: str) -> JsonObject:
    scrapers = {
        "gv": _scrape_gv,
        "shaw": _scrape_shaw,
        "carnival": _scrape_carnival,
        "eaglewing": _scrape_eaglewing,
        "filmhouse": _scrape_filmhouse,
        "sfs": _scrape_sfs,
    }
    try:
        return scrapers[chain]()
    except KeyError as exc:
        raise ValueError(f"Unsupported cinema chain: {chain}") from exc


def scrape_to_raw_dir(
    out_dir: str | Path = "data/raw",
    chains: tuple[str, ...] = CINEMA_CHAINS,
) -> dict[str, JsonObject]:
    output_path = Path(out_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    results = {}
    for chain in chains:
        data = scrape_chain(chain)
        (output_path / f"{chain}.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
        results[chain] = data
    return results


def _scrape_gv() -> JsonObject:
    headers = build_gv_headers("https://www.gv.com.sg/GVMovies")

    def post_endpoint(path: str, payload: dict[str, Any] | None = None) -> Any:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request_headers = dict(headers)
        if payload is not None:
            request_headers["content-type"] = "application/json; charset=UTF-8"
            request_headers["Referer"] = "https://www.gv.com.sg/GVBuyTickets"
        return _request_json(f"https://www.gv.com.sg/.gv-api/{path}", method="POST", headers=request_headers, body=body)

    movies = []
    seen_film_codes = set()
    for endpoint in ("nowshowing", "comingsoon", "advancesales"):
        response = post_endpoint(endpoint)
        if response and response.get("success") and response.get("data"):
            for movie in response["data"]:
                film_code = movie.get("filmCd")
                if film_code in seen_film_codes:
                    continue
                seen_film_codes.add(film_code)
                movies.append(movie)

    cinemas_response = post_endpoint("cinemas")
    cinemas = cinemas_response.get("data", []) if cinemas_response else []

    showtimes = []
    for offset in range(7):
        day = _today_sgt() + timedelta(days=offset)
        response = post_endpoint(
            "v2buytickets",
            {
                "cinemaId": "",
                "filmCode": "",
                "date": _midnight_epoch_ms(day),
                "advanceSales": False,
            },
        )
        showtimes.extend(_flatten_gv_showtimes(response.get("data", {}).get("cinemas", []) if response else []))

    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def build_gv_headers(referer: str) -> dict[str, str]:
    return {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x_developer": "ENOVAX",
        "Referer": referer,
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
    }


def _flatten_gv_showtimes(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flattened = []
    for cinema_showtimes in records or []:
        cinema_id = cinema_showtimes.get("id")
        for movie_showtimes in cinema_showtimes.get("movies", []):
            movie_info = {key: value for key, value in movie_showtimes.items() if key != "times"}
            for timeslot in movie_showtimes.get("times", []):
                flattened.append({"cinemaId": cinema_id, **movie_info, **timeslot})
    return flattened


def _scrape_shaw() -> JsonObject:
    base = "https://shaw.sg"
    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-SG,en;q=0.9",
        "content-type": "application/json",
        "x-api-forward-to": "internal",
        "x-app": "PWSM",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "Referer": f"{base}/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }
    selectors = _request_json(f"{base}/internal/get_selectors?cache=no-cache", headers=headers)
    movies = [
        {
            "movieReleaseId": int(item.get("code", 0)),
            "primaryTitle": item.get("name", ""),
            "formatCode": "",
            "isLimited": False,
            "isNewRelease": False,
            "isExclusive": False,
            "isSneakPreview": False,
            "isAdvanceSales": False,
            "releaseDate": datetime.now(SGT).isoformat(),
            "duration": 0,
            "posterUrl": "",
            "synopsisShort": "",
            "classifyCode": "",
            "adviceName": "",
            "code": None,
        }
        for item in selectors
        if item.get("type") == 1
    ]
    cinemas = _request_json(f"{base}/internal/get_simple_locations", headers=headers)
    showtimes = []
    for offset in range(7):
        day = _today_sgt() + timedelta(days=offset)
        params = urlencode({"date": day.isoformat(), "movieId": "0", "locationId": "0", "promotionId": "0"})
        records = _request_json(f"{base}/internal/get_show_times?{params}", headers=headers)
        for record in records or []:
            movie_info = {key: value for key, value in record.items() if key != "showTimes"}
            for timeslot in record.get("showTimes", []):
                showtimes.append({**movie_info, **timeslot})
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def _scrape_carnival() -> JsonObject:
    token = _generate_carnival_token()
    movies = _fetch_carnival_movies(token)
    cinemas = [
        {
            "id": "golden-mile-tower",
            "name": "Carnival Cinemas Golden Mile Tower",
            "address": "6001 Beach Road, #B1-01, Golden Mile Tower, Singapore 199589",
        },
        {
            "id": "shaw-tower",
            "name": "Carnival Cinemas Shaw Tower",
            "address": "100 Beach Road, #B1-01, Shaw Tower, Singapore 189702",
        },
        {"id": "punggol", "name": "Carnival Cinemas Punggol", "address": "Punggol Dormitory, Singapore"},
        {"id": "rex-mackenzie", "name": "Rex Cinema Mackenzie Road", "address": "2 Mackenzie Road, Singapore 228677"},
    ]
    showtimes = []
    for offset in range(7):
        day = _today_sgt() + timedelta(days=offset)
        for movie in movies:
            result = _fetch_carnival_showtimes(token, str(movie.get("code", "")), day.isoformat())
            if any(group.get("sessions") for group in result.get("groups", [])):
                showtimes.append(result)
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def _generate_carnival_token() -> str:
    movie_code = "rz8LuOtFBXphj9WQfvFh"
    site_url = "https://carnivalcinemas.sg/#/"
    user_agent = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    key = base64.b64encode(hmac.new(movie_code.encode(), f"{site_url}|{movie_code}".encode(), sha256).digest()).decode()
    ticks = int(time.time() * 1000) * 10000 + 621355968000000000
    digest = base64.b64encode(hmac.new(key.encode(), f"{user_agent}|{ticks}".encode(), sha256).digest()).decode()
    payload = f"{digest}|{site_url}|{ticks}|{movie_code}"
    return base64.b64encode(payload.encode()).decode()


def _carnival_headers(token: str) -> dict[str, str]:
    return {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "Token": token,
        "Referer": "https://carnivalcinemas.sg/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }


def _fetch_carnival_movies(token: str) -> list[dict[str, Any]]:
    data = _request_json(
        "https://service.carnivalcinemas.sg/api/QuickSearch/GetNowPlayingMovies?location=Mumbai",
        headers=_carnival_headers(token),
    )
    if data.get("responseError", {}).get("ErrorCode") != "200":
        raise RuntimeError(f"Carnival movies API error: {data.get('responseError', {}).get('ErrorMessage')}")
    movies = []
    for movie in data.get("responseMovies", []):
        movies.append(
            {
                "code": movie.get("code") or movie.get("Code") or "",
                "name": movie.get("name") or movie.get("Name") or "",
                "censor": movie.get("censor") or movie.get("Censor") or "",
                "language": movie.get("language") or movie.get("Language") or "",
                "duration": int(movie.get("duration") or movie.get("Duration") or 0),
                "genre": movie.get("genre") or movie.get("Genre") or "",
                "description": movie.get("description") or movie.get("Description") or "",
                "openingDate": movie.get("openingDate") or movie.get("OpeningDate") or "",
                "imageURL": movie.get("imageURL") or movie.get("ImageURL") or "",
                "actor": movie.get("actor") or movie.get("Actor") or "",
                "director": movie.get("director") or movie.get("Director") or "",
                "YouTubeURL": movie.get("youTubeURL") or movie.get("YouTubeURL") or movie.get("youtubeUrl") or "",
            }
        )
    return movies


def _fetch_carnival_showtimes(token: str, movie_code: str, show_date: str) -> dict[str, Any]:
    try:
        url = (
            "https://service.carnivalcinemas.sg/api/QuickSearch/GetCinemaAndShowTimeByMovie"
            f"?location=Mumbai&movieCode={quote(movie_code)}&date={show_date}"
        )
        data = _request_json(url, headers=_carnival_headers(token))
        return _parse_carnival_showtimes(data, movie_code, show_date)
    except Exception:
        return {"movieCode": movie_code, "date": show_date, "groups": []}


def _parse_carnival_showtimes(data: Any, movie_code: str, show_date: str) -> dict[str, Any]:
    records = data if isinstance(data, list) else data.get("responseCinemaWithShowTime", [])
    cinema_map: dict[str, dict[str, Any]] = {}
    for item in records or []:
        cinema_name = item.get("cinemaName") or item.get("CinemaName") or ""
        cinema_address = item.get("CinemaAddress") or item.get("cinemaAddress") or ""
        raw_time = str(item.get("showTime") or item.get("ShowTime") or "").strip()
        show_time = re.sub(r"T$", "", raw_time, flags=re.IGNORECASE).strip()
        fallback_show_id = f"{movie_code}-{show_date}-{show_time}"
        show_id = str(item.get("longSessionID") or item.get("LongSessionId") or fallback_show_id).strip()
        cinema_map.setdefault(
            cinema_name,
            {"cinemaName": cinema_name, "cinemaAddress": cinema_address, "sessions": []},
        )
        cinema_map[cinema_name]["sessions"].append(
            {
                "showId": show_id,
                "showTime": show_time,
                "format": "2D",
                "screen": "",
                "bookingLink": "https://carnivalcinemas.sg/",
            }
        )
    return {"movieCode": movie_code, "date": show_date, "groups": list(cinema_map.values())}


def _scrape_eaglewing() -> JsonObject:
    movies, showtimes = _scrape_eaglewing_movies_and_showtimes()
    cinemas = [
        {
            "id": "1",
            "name": "EagleWings Cinematics",
            "address": "9 King Albert Park, #B1-01, KAP Mall, Singapore 598332",
        }
    ]
    return {"movies": movies, "cinemas": cinemas, "showtimes": showtimes}


def extract_eaglewing_csrf_token(page_html: str) -> str:
    match = re.search(r'<meta name="csrf-token" content="([^"]+)"', page_html)
    return match.group(1) if match else ""


def extract_eaglewing_movie_vars(page_html: str) -> dict[str, str]:
    cinema_match = re.search(r'CinemaId\s*:\s*"([^"]+)"', page_html)
    scheduled_match = re.search(r'ScheduledFilmId\s*:\s*"([^"]+)"', page_html)
    return {
        "cinemaId": cinema_match.group(1) if cinema_match else "0000000001",
        "scheduledFilmId": scheduled_match.group(1) if scheduled_match else "",
    }


def _scrape_eaglewing_movies_and_showtimes() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    base = "https://www.eaglewingscinematics.com.sg"
    page_html, headers = _request_text(f"{base}/movies")
    csrf = extract_eaglewing_csrf_token(page_html)
    if not csrf:
        raise RuntimeError("EagleWings: could not read CSRF token")
    cookies = []
    for cookie in headers.get_all("Set-Cookie", []):
        cookies.append(cookie.split(";", 1)[0])
    cookie_string = "; ".join(cookies)
    xsrf_match = re.search(r"XSRF-TOKEN=([^;]+)", cookie_string)
    xsrf = unquote(xsrf_match.group(1)) if xsrf_match else ""
    api_headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "x-csrf-token": csrf,
        "x-xsrf-token": xsrf,
        "x-requested-with": "XMLHttpRequest",
        "cookie": cookie_string,
        "Referer": f"{base}/movies",
    }
    raw_films = _request_json(f"{base}/api/v1/film/showings", headers=api_headers)
    movies = []
    showtimes = []
    for film in raw_films:
        url_match = re.search(r"/movie/([^/]+)/([^/]+)$", film.get("link", ""))
        if not url_match:
            continue
        slug, film_code = url_match.group(1), url_match.group(2)
        detail_url = f"{base}/movie/{slug}/{film_code}"
        try:
            detail_html, _ = _request_text(detail_url, headers={"cookie": cookie_string})
            vars_ = extract_eaglewing_movie_vars(detail_html)
            scheduled_film_id = vars_["scheduledFilmId"]
            if not scheduled_film_id:
                continue
            movie_id = int(scheduled_film_id)
            movies.append(
                {
                    "id": movie_id,
                    "slug": slug,
                    "title": film.get("title") or slug.replace("-", " "),
                    "rating": film.get("rating") or "",
                    "language": "",
                    "genre": "",
                    "duration": 0,
                    "synopsis": film.get("description") or "",
                    "posterUrl": film.get("image") or "",
                    "openingDate": film.get("openingdate") or "",
                }
            )
            session_headers = {**api_headers, "Referer": detail_url}
            sessions_data = _post_json(
                f"{base}/api/v1/film/time-scheduled",
                {
                    "movie": {"Title": film.get("title"), "Rating": film.get("rating")},
                    "cinema_id": vars_["cinemaId"],
                    "scheduledfilm_id": scheduled_film_id,
                },
                session_headers,
            )
            sessions_by_date: dict[str, list[dict[str, Any]]] = {}
            for group in sessions_data.get("films", []):
                hall = group.get("ScreenName") or ""
                for day_sessions in (group.get("times") or {}).values():
                    for session in day_sessions:
                        screen = session.get("screen") or {}
                        raw = screen.get("raw") or ""
                        if not raw:
                            continue
                        session_date = raw.split("T", 1)[0]
                        sessions_by_date.setdefault(session_date, []).append(
                            {
                                "id": str(screen.get("stamp") or session.get("id") or f"{movie_id}-{raw}"),
                                "date": session_date,
                                "time": screen.get("time") or session.get("time") or "",
                                "hall": hall,
                                "format": "2D",
                                "bookingUrl": session.get("link") or f"{base}/movies",
                            }
                        )
            for session_date, sessions in sessions_by_date.items():
                if sessions:
                    showtimes.append(
                        {
                            "movieId": movie_id,
                            "movieSlug": slug,
                            "date": session_date,
                            "sessions": sessions,
                        }
                    )
        except Exception as exc:
            print(f"EagleWings: error processing {slug}: {exc}")
            continue
    return movies, showtimes


def _scrape_filmhouse() -> JsonObject:
    movies, sessions = _fetch_filmhouse_films_and_sessions()
    return {
        "movies": movies,
        "cinemas": [
            {
                "id": "1",
                "name": "Filmhouse",
                "address": "8 Grange Road, #04-01/07, Cathay Cineleisure Orchard, Singapore 239695",
            }
        ],
        "showtimes": sessions,
    }


def _decode_html(value: str) -> str:
    return html.unescape(value).replace("\xa0", " ")


def _strip_tags(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", _decode_html(value))).strip()


def _get_attr(markup: str, name: str) -> str:
    match = re.search(rf"{name}=[\"']([^\"']+)[\"']", markup, re.IGNORECASE)
    return match.group(1) if match else ""


def _split_filmhouse_blocks(page_html: str) -> list[str]:
    marker = '<div class="jacro-event movie-tabs row"'
    blocks = []
    start = page_html.find(marker)
    while start >= 0:
        next_start = page_html.find(marker, start + len(marker))
        blocks.append(page_html[start : next_start if next_start >= 0 else len(page_html)])
        start = next_start
    return blocks


def parse_filmhouse_films(page_html: str) -> list[dict[str, Any]]:
    films = []
    for block in _split_filmhouse_blocks(page_html):
        title_anchor = re.search(r"<a[^>]*class=[\"']liveeventtitle[\"'][^>]*>([\s\S]*?)</a>", block, re.IGNORECASE)
        title = _strip_tags(title_anchor.group(1) if title_anchor else "")
        href = _get_attr(title_anchor.group(0), "href") if title_anchor else ""
        url_match = re.search(r"/film/(\d+)/([^/\"']+)", href)
        film_id = url_match.group(1) if url_match else ""
        slug = url_match.group(2) if url_match else ""
        image_block_match = re.search(r"<div class=[\"']film_img[\"'][\s\S]*?</div>", block, re.IGNORECASE)
        image_block = image_block_match.group(0) if image_block_match else ""
        image_match = re.search(r"<img[^>]+>", image_block, re.IGNORECASE)
        poster_url = _get_attr(image_match.group(0), "src") if image_match else ""
        running_time = re.search(r"<div class=[\"']running-time[\"'][^>]*>([\s\S]*?)</div>", block, re.IGNORECASE)
        running_time_html = running_time.group(1) if running_time else ""
        spans = [
            _strip_tags(match.group(1))
            for match in re.finditer(
                r"<span[^>]*>([\s\S]*?)</span>",
                running_time_html,
                re.IGNORECASE,
            )
        ]
        duration = 0
        rating = ""
        genre = ""
        for span in spans:
            duration_match = re.search(r"(\d+)mins", span, re.IGNORECASE)
            if duration_match:
                duration = int(duration_match.group(1))
            elif span.startswith("("):
                rating = span.replace("(", "").replace(")", "").strip()
            elif not re.match(r"^\d{4}$", span):
                genre = span
        language_match = re.search(r"In\s+([^.<]+)", block, re.IGNORECASE)
        language = _strip_tags(language_match.group(1) if language_match else "")
        sessions = []
        performance_match = re.search(
            r"<ul class=[\"']performance-list-items[\"'][^>]*>([\s\S]*?)</ul>",
            block,
            re.IGNORECASE,
        )
        performance_html = performance_match.group(1) if performance_match else ""
        current_date = ""
        token_pattern = re.compile(
            r"<div class=[\"']heading[\"'][^>]*>([\s\S]*?)</div>|<li[^>]*>([\s\S]*?)</li>",
            re.IGNORECASE,
        )
        for token in token_pattern.finditer(performance_html):
            if token.group(1):
                current_date = _strip_tags(token.group(1))
                continue
            item_html = token.group(2) or ""
            anchor_match = re.search(
                r"<a[^>]*class=[\"'][^\"']*film_book_button[^\"']*[\"'][^>]*>[\s\S]*?</a>",
                item_html,
                re.IGNORECASE,
            )
            if not anchor_match:
                continue
            anchor = anchor_match.group(0)
            book_url = _get_attr(anchor, "href")
            session_match = re.search(r"/booknow/(\d+)", book_url)
            time_match = re.search(r"<span[^>]*class=[\"']time[\"'][^>]*>([\s\S]*?)</span>", anchor, re.IGNORECASE)
            format_match = re.search(r"<span[^>]*class=[\"']tag[\"'][^>]*>([\s\S]*?)</span>", item_html, re.IGNORECASE)
            sessions.append(
                {
                    "sessionId": session_match.group(1) if session_match else "",
                    "date": current_date,
                    "time": _strip_tags(time_match.group(1) if time_match else ""),
                    "format": _strip_tags(format_match.group(1) if format_match else "") or "2D",
                    "bookUrl": book_url,
                }
            )
        films.append(
            {
                "id": film_id,
                "slug": slug,
                "title": title,
                "duration": duration,
                "rating": rating,
                "genre": genre,
                "language": language,
                "posterUrl": poster_url,
                "sessions": sessions,
            }
        )
    return films


def _fetch_filmhouse_films_and_sessions() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    page_html, _ = _request_text("https://filmhouse.sg/films/")
    raw_films = parse_filmhouse_films(page_html)
    movies = []
    sessions = []
    for film in raw_films:
        if not film["id"]:
            continue
        movies.append(
            {
                "id": film["id"],
                "title": film["title"] or film["slug"].replace("-", " "),
                "rating": film["rating"],
                "language": film["language"],
                "genre": film["genre"],
                "duration": film["duration"],
                "synopsis": "",
                "posterUrl": film["posterUrl"],
                "trailerUrl": "",
                "openingDate": "",
            }
        )
        for session in film["sessions"]:
            if not session["sessionId"] or not session["date"] or not session["time"]:
                continue
            start_time = _parse_filmhouse_datetime(session["date"], session["time"])
            if not start_time:
                continue
            sessions.append(
                {
                    "id": session["sessionId"],
                    "filmId": film["id"],
                    "screenId": "",
                    "screenName": "",
                    "startTime": start_time,
                    "attributes": [session["format"]] if session["format"] and session["format"] != "2D" else [],
                    "bookingUrl": session["bookUrl"] or "https://filmhouse.sg/films/",
                }
            )
    return movies, sessions


def _parse_filmhouse_datetime(date_text: str, time_text: str) -> str:
    month_map = {
        "Jan": "01",
        "Feb": "02",
        "Mar": "03",
        "Apr": "04",
        "May": "05",
        "Jun": "06",
        "Jul": "07",
        "Aug": "08",
        "Sep": "09",
        "Oct": "10",
        "Nov": "11",
        "Dec": "12",
    }
    date_match = re.search(r"(\d{1,2})(?:st|nd|rd|th)\s+(\w+)", date_text)
    if not date_match:
        return ""
    month = month_map.get(date_match.group(2)[:3])
    if not month:
        return ""
    year = _today_sgt().year
    if int(month) < datetime.now(SGT).month - 2:
        year += 1
    time_match = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)", time_text, re.IGNORECASE)
    if not time_match:
        return ""
    hours = int(time_match.group(1))
    minutes = time_match.group(2)
    period = time_match.group(3).lower()
    if period == "pm" and hours != 12:
        hours += 12
    if period == "am" and hours == 12:
        hours = 0
    return f"{year}-{month}-{int(date_match.group(1)):02d}T{hours:02d}:{minutes}:00+08:00"


def _scrape_sfs() -> JsonObject:
    movies, showtimes = _scrape_sfs_movies_and_showtimes()
    return {
        "movies": movies,
        "cinemas": [
            {
                "id": "1",
                "name": "SFS Somerset (Hall 6)",
                "address": "8 Grange Road, #06-01, Cathay Cineleisure Orchard, Singapore 239695",
            }
        ],
        "showtimes": showtimes,
    }


def _collect_peatix_links(page_html: str) -> list[str]:
    return list(
        dict.fromkeys(
            _decode_html(match.group(1))
            for match in re.finditer(
                r"href=[\"'](https://[^\"']*peatix\.com[^\"']*)[\"']",
                page_html,
                re.IGNORECASE,
            )
        )
    )


def parse_sfs_session_lines(page_html: str) -> list[dict[str, str]]:
    sessions = []
    seen = set()
    decoded = re.sub(r"\s+", " ", _decode_html(page_html))
    pattern = re.compile(
        r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Thurs)\s+"
        r"(\d{1,2})\s+([A-Za-z]+),?\s+([\d.:]+(?:am|pm))\s+\(([^)]+)\)",
        re.IGNORECASE,
    )
    for match in pattern.finditer(decoded):
        key = match.group(0)
        if key in seen:
            continue
        seen.add(key)
        sessions.append(
            {
                "day": match.group(1),
                "month": match.group(2),
                "time": match.group(3),
                "filmTitle": match.group(4).strip(),
            }
        )
    return sessions


def _scrape_sfs_movies_and_showtimes() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    page_html, _ = _request_text("https://sfs-somerset.com")
    peatix_links = _collect_peatix_links(page_html)
    movies_by_id: dict[str, dict[str, Any]] = {}
    showtimes = []
    for peatix_url in peatix_links:
        try:
            peatix_html, _ = _request_text(peatix_url)
            for session in parse_sfs_session_lines(peatix_html):
                parsed = _parse_sfs_datetime(session["day"], session["month"], session["time"])
                if not parsed["date"] or not parsed["time"]:
                    continue
                film_title = session["filmTitle"]
                movie_id = _slugify(film_title)
                movies_by_id[movie_id] = {
                    "id": movie_id,
                    "title": film_title,
                    "language": "",
                    "genre": "",
                    "duration": 0,
                    "synopsis": "",
                    "posterUrl": "",
                    "peatixEventUrl": peatix_url,
                }
                showtimes.append(
                    {
                        "movieId": movie_id,
                        "movieTitle": film_title,
                        "date": parsed["date"],
                        "time": parsed["time"],
                        "endTime": "",
                        "peatixUrl": peatix_url,
                    }
                )
        except Exception as exc:
            print(f"SFS: error scraping Peatix page {peatix_url}: {exc}")
            continue
    return list(movies_by_id.values()), showtimes


def _parse_sfs_datetime(day: str, month_text: str, time_text: str) -> dict[str, str]:
    month_map = {
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
    month = month_map.get(month_text.lower()[:3])
    if not month:
        return {"date": "", "time": ""}
    year = _today_sgt().year
    if int(month) < datetime.now(SGT).month - 2:
        year += 1
    time_match = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)", time_text.replace(".", ":"), re.IGNORECASE)
    if not time_match:
        return {"date": f"{year}-{month}-{int(day):02d}", "time": ""}
    hours = int(time_match.group(1))
    minutes = time_match.group(2)
    period = time_match.group(3).lower()
    if period == "pm" and hours != 12:
        hours += 12
    if period == "am" and hours == 12:
        hours = 0
    display_hour = hours % 12 or 12
    return {"date": f"{year}-{month}-{int(day):02d}", "time": f"{display_hour}:{minutes} {period.upper()}"}


def _slugify(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))
