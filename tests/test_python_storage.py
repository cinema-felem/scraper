import json
import os
import tempfile
import unittest
from pathlib import Path
from typing import Any

from pyetl.storage import _insert_cinemas, _insert_movies, _insert_showtimes, load_intermediate_file


class FakeCursor:
    def __init__(self, fetch_results=None) -> None:
        self.calls: list[tuple[str, tuple[Any, ...]]] = []
        self._fetch_results = fetch_results or []

    def execute(self, sql: str, params: tuple[Any, ...] | None = None) -> None:
        self.calls.append((sql, params or ()))

    def fetchone(self):
        return self._fetch_results.pop(0) if self._fetch_results else None


def identity_json(value):
    return value


class PythonStorageTest(unittest.TestCase):
    def test_dry_run_validates_merge_file_and_reports_counts(self) -> None:
        payload = {
            "movies": [{"id": "movie:1", "filmTitle": "Movie", "language": "English", "format": "2D"}],
            "cinemas": [{"id": "cinema:1", "name": "Cinema", "searchableName": "Cinema"}],
            "showtimes": [
                {
                    "id": "showtime:1",
                    "filmId": "movie:1",
                    "cinemaId": "cinema:1",
                    "unixTime": 1781438400000,
                    "link": "https://example.com",
                    "ticketType": {"type": "2D"},
                    "movieFormat": "2D",
                    "details": {},
                }
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "merge.json"
            path.write_text(json.dumps(payload), encoding="utf-8")

            result = load_intermediate_file(path, dry_run=True)

        self.assertEqual(
            result,
            {
                "movies": 1,
                "cinemas": 1,
                "showtimes": 1,
                "invalidShowtimes": 0,
                "dryRun": True,
            },
        )

    def test_live_load_requires_database_url(self) -> None:
        old_database_url = os.environ.pop("DATABASE_URL", None)
        try:
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / "merge.json"
                path.write_text(json.dumps({"movies": [], "cinemas": [], "showtimes": []}), encoding="utf-8")

                with self.assertRaisesRegex(RuntimeError, "DATABASE_URL"):
                    load_intermediate_file(path, dry_run=False)
        finally:
            if old_database_url is not None:
                os.environ["DATABASE_URL"] = old_database_url

    def test_insert_cinemas_sets_updated_at_for_prisma_schema(self) -> None:
        cursor = FakeCursor()

        count = _insert_cinemas(
            cursor,
            [
                {
                    "id": "cinema:1",
                    "name": "Cinema",
                    "searchableName": "Cinema",
                    "source": {"details": {"address": "Address"}},
                }
            ],
            identity_json,
        )

        self.assertEqual(count, 1)
        sql, params = cursor.calls[0]
        self.assertIn('"updatedAt"', sql)
        self.assertEqual(params[0], "cinema:1")
        self.assertIsNotNone(params[-1])

    def test_insert_movies_generates_id_and_updates_existing_identifier_sets(self) -> None:
        insert_cursor = FakeCursor()

        inserted = _insert_movies(
            insert_cursor,
            [{"id": "source:1", "filmTitle": "Movie", "language": "English", "format": "2D"}],
        )

        self.assertEqual(inserted, 1)
        self.assertEqual(len(insert_cursor.calls), 2)
        insert_sql, insert_params = insert_cursor.calls[1]
        self.assertIn('"updatedAt"', insert_sql)
        self.assertEqual(insert_params[1], "Movie")
        self.assertEqual(insert_params[4], ["Movie"])
        self.assertEqual(insert_params[5], ["source:1"])

        update_cursor = FakeCursor(fetch_results=[("db-movie-id", ["Movie"], ["existing:1"])])
        updated = _insert_movies(
            update_cursor,
            [{"id": "source:2", "filmTitle": "Movie", "language": "English", "format": "2D"}],
        )

        self.assertEqual(updated, 1)
        update_sql, update_params = update_cursor.calls[1]
        self.assertIn('UPDATE public."Movie"', update_sql)
        self.assertEqual(update_params[1], ["existing:1", "source:2"])

    def test_insert_showtimes_uses_database_movie_id_and_sets_updated_at(self) -> None:
        cursor = FakeCursor()

        inserted = _insert_showtimes(
            cursor,
            [
                {
                    "filmId": "source:1",
                    "cinemaId": "cinema:1",
                    "unixTime": 1781438400000,
                    "link": "https://example.com",
                    "ticketType": {"type": "2D"},
                    "movieFormat": "2D",
                    "details": {"screen": "1"},
                },
                {
                    "filmId": "missing",
                    "cinemaId": "cinema:1",
                    "unixTime": 1781438400000,
                },
            ],
            {"source:1": "db-movie-id"},
            identity_json,
        )

        self.assertEqual(inserted, 1)
        sql, params = cursor.calls[0]
        self.assertIn('"updatedAt"', sql)
        self.assertEqual(params[4], "db-movie-id")
        self.assertEqual(params[7], "source:1")


if __name__ == "__main__":
    unittest.main()
