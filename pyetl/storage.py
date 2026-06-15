"""Load transformed cinema data into the existing Postgres schema."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

CinemaData = dict[str, list[dict[str, Any]]]


def load_intermediate_file(
    path: str | Path = "data/intermediate/merge.json",
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    data = json.loads(Path(path).read_text())
    invalid_showtimes = _invalid_showtimes(data)
    result = {
        "movies": len(data.get("movies", [])),
        "cinemas": len(data.get("cinemas", [])),
        "showtimes": len(data.get("showtimes", [])),
        "invalidShowtimes": len(invalid_showtimes),
        "dryRun": dry_run,
    }
    if dry_run:
        return result

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required for live storage loads")
    if invalid_showtimes:
        raise RuntimeError(f"Refusing to load {len(invalid_showtimes)} invalid showtimes")

    return _load_postgres(database_url, data) | result


def _invalid_showtimes(data: CinemaData) -> list[dict[str, Any]]:
    movie_ids = {movie.get("id") for movie in data.get("movies", [])}
    cinema_ids = {cinema.get("id") for cinema in data.get("cinemas", [])}
    invalid = []
    for showtime in data.get("showtimes", []):
        if (
            not showtime.get("filmId")
            or showtime.get("filmId") not in movie_ids
            or not showtime.get("cinemaId")
            or showtime.get("cinemaId") not in cinema_ids
            or not showtime.get("unixTime")
        ):
            invalid.append(showtime)
    return invalid


def _load_postgres(database_url: str, data: CinemaData) -> dict[str, int]:
    try:
        import psycopg
        from psycopg.types.json import Jsonb
    except ImportError as exc:
        raise RuntimeError(
            "Install psycopg to run live storage loads: python3 -m pip install 'psycopg[binary]'"
        ) from exc

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cinema_count = _insert_cinemas(cur, data.get("cinemas", []), Jsonb)
            movie_count = _insert_movies(cur, data.get("movies", []))
            movie_map = _load_movie_id_map(cur)
            cur.execute('DELETE FROM public."Showtime"')
            showtime_count = _insert_showtimes(cur, data.get("showtimes", []), movie_map, Jsonb)
        conn.commit()
    return {"loadedCinemas": cinema_count, "loadedMovies": movie_count, "loadedShowtimes": showtime_count}


def _insert_cinemas(cur: Any, cinemas: list[dict[str, Any]], jsonb: Any) -> int:
    inserted = 0
    for cinema in cinemas:
        updated_at = datetime.now()
        cur.execute(
            """
            INSERT INTO public."Cinema" (id, name, "searchableName", source, "updatedAt")
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              "searchableName" = EXCLUDED."searchableName",
              source = EXCLUDED.source,
              "updatedAt" = EXCLUDED."updatedAt"
            """,
            (
                cinema.get("id"),
                cinema.get("name", ""),
                cinema.get("searchableName", cinema.get("name", "")),
                jsonb(cinema.get("source", {}).get("details", cinema.get("source", {}))),
                updated_at,
            ),
        )
        inserted += 1
    return inserted


def _insert_movies(cur: Any, movies: list[dict[str, Any]]) -> int:
    inserted = 0
    for movie in movies:
        title = movie.get("filmTitle", "")
        source_id = movie.get("id", "")
        existing = _find_existing_movie(cur, title, source_id)
        updated_at = datetime.now()
        if existing:
            db_id, title_variations, movie_ids = existing
            cur.execute(
                """
                UPDATE public."Movie"
                SET "titleVariations" = %s,
                    "movieIds" = %s,
                    "updatedAt" = %s
                WHERE id = %s
                """,
                (
                    _unique_append(title_variations or [], title),
                    _unique_append(movie_ids or [], source_id),
                    updated_at,
                    db_id,
                ),
            )
            inserted += 1
            continue

        cur.execute(
            """
            INSERT INTO public."Movie" (id, title, language, format, "titleVariations", "movieIds", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                str(uuid.uuid4()),
                title,
                movie.get("language") or "Unknown",
                movie.get("format") or "2D",
                [title],
                [source_id],
                updated_at,
            ),
        )
        inserted += 1
    return inserted


def _find_existing_movie(cur: Any, title: str, source_id: str) -> tuple[str, list[str], list[str]] | None:
    cur.execute(
        """
        SELECT id, "titleVariations", "movieIds"
        FROM public."Movie"
        WHERE %s = ANY("movieIds")
           OR lower(title) = lower(%s)
           OR %s = ANY("titleVariations")
        LIMIT 1
        """,
        (source_id, title, title),
    )
    return cur.fetchone()


def _unique_append(values: list[str], value: str) -> list[str]:
    return values if value in values else [*values, value]


def _load_movie_id_map(cur: Any) -> dict[str, str]:
    cur.execute('SELECT id, "movieIds" FROM public."Movie"')
    movie_map: dict[str, str] = {}
    for db_id, movie_ids in cur.fetchall():
        for movie_id in movie_ids or []:
            movie_map[movie_id] = db_id
    return movie_map


def _insert_showtimes(
    cur: Any,
    showtimes: list[dict[str, Any]],
    movie_map: dict[str, str],
    jsonb: Any,
) -> int:
    inserted = 0
    for showtime in showtimes:
        source_film_id = str(showtime.get("filmId", ""))
        db_movie_id = movie_map.get(source_film_id)
        if not db_movie_id:
            continue
        ticket_type = showtime.get("ticketType") or {}
        unix_time = int(showtime.get("unixTime") or 0)
        updated_at = datetime.now()
        cur.execute(
            """
            INSERT INTO public."Showtime"
              (
                "unixTime", link, "ticketType", "movieFormat", "filmId",
                "cinemaId", details, "theatreFilmId", "updatedAt"
              )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                unix_time,
                showtime.get("link", ""),
                ticket_type.get("type", "Standard") if isinstance(ticket_type, dict) else "Standard",
                showtime.get("movieFormat", ""),
                db_movie_id,
                showtime.get("cinemaId"),
                jsonb(showtime.get("details", {})),
                source_film_id,
                updated_at,
            ),
        )
        inserted += 1
    return inserted
