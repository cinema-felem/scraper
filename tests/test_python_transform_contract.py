import json
import tempfile
import unittest
from pathlib import Path

from pyetl.chains import CINEMA_CHAINS
from pyetl.transform import transform_chain, transform_raw_dir


class PythonTransformContractTest(unittest.TestCase):
    def test_chain_registry_matches_supported_pipeline(self) -> None:
        self.assertEqual(
            CINEMA_CHAINS,
            ("gv", "shaw", "carnival", "eaglewing", "filmhouse", "sfs"),
        )

    def test_carnival_normalizes_trailing_time_flags(self) -> None:
        result = transform_chain(
            "carnival",
            {
                "movies": [
                    {
                        "code": "Habeebi ",
                        "name": "Habeebi",
                        "censor": "",
                        "language": "Tamil",
                        "duration": 0,
                        "genre": "",
                        "openingDate": "",
                    }
                ],
                "cinemas": [
                    {
                        "id": "golden-mile-tower",
                        "name": "Carnival Cinema Golden Mile Tower",
                        "address": "Golden Mile Tower",
                    }
                ],
                "showtimes": [
                    {
                        "movieCode": "Habeebi ",
                        "date": "2026-06-14",
                        "groups": [
                            {
                                "cinemaName": "Carnival Cinema Golden Mile Tower",
                                "cinemaAddress": "Golden Mile Tower",
                                "sessions": [
                                    {
                                        "showId": "35272",
                                        "showTime": "08:30 PMF",
                                        "format": "2D",
                                        "screen": "",
                                        "bookingLink": "https://carnivalcinemas.sg/",
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        )

        self.assertEqual(len(result["showtimes"]), 1)
        self.assertGreater(result["showtimes"][0]["unixTime"], 0)

    def test_transforms_current_raw_files_with_valid_references(self) -> None:
        raw_dir = Path("data/raw")
        self.assertTrue(raw_dir.exists())

        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp)
            merged = transform_raw_dir(raw_dir, out_dir)

            self.assertEqual(
                sorted(path.name for path in out_dir.glob("*.json")),
                [
                    "carnival.json",
                    "eaglewing.json",
                    "filmhouse.json",
                    "gv.json",
                    "merge.json",
                    "sfs.json",
                    "shaw.json",
                ],
            )

            for chain in CINEMA_CHAINS:
                data = json.loads((out_dir / f"{chain}.json").read_text())
                movie_ids = {movie["id"] for movie in data["movies"]}
                cinema_ids = {cinema["id"] for cinema in data["cinemas"]}
                self.assertTrue(data["showtimes"], chain)
                self.assertFalse(
                    [showtime for showtime in data["showtimes"] if showtime["filmId"] not in movie_ids],
                    f"{chain} has bad film references",
                )
                self.assertFalse(
                    [showtime for showtime in data["showtimes"] if showtime["cinemaId"] not in cinema_ids],
                    f"{chain} has bad cinema references",
                )
                self.assertFalse(
                    [showtime for showtime in data["showtimes"] if showtime["unixTime"] <= 0],
                    f"{chain} has bad timestamps",
                )

            merge_movie_ids = {movie["id"] for movie in merged["movies"]}
            merge_cinema_ids = {cinema["id"] for cinema in merged["cinemas"]}
            self.assertFalse(
                [showtime for showtime in merged["showtimes"] if showtime["filmId"] not in merge_movie_ids],
                "merge has bad film references",
            )
            self.assertFalse(
                [showtime for showtime in merged["showtimes"] if showtime["cinemaId"] not in merge_cinema_ids],
                "merge has bad cinema references",
            )


if __name__ == "__main__":
    unittest.main()
