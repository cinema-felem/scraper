import unittest

from pyetl.scrape import (
    extract_eaglewing_csrf_token,
    extract_eaglewing_movie_vars,
    parse_filmhouse_films,
    parse_sfs_session_lines,
)


class PythonScrapeParserTest(unittest.TestCase):
    def test_eaglewing_extracts_csrf_and_movie_vars(self) -> None:
        html = """
          <meta name="csrf-token" content="token-123">
          <script>
            window.Vars = {
              Movie : { 'Title' : "Toy Story", 'Rating' : "PG" },
              CinemaId : "0000000001",
              ScheduledFilmId : "1000000658"
            };
          </script>
        """

        self.assertEqual(extract_eaglewing_csrf_token(html), "token-123")
        self.assertEqual(
            extract_eaglewing_movie_vars(html),
            {"cinemaId": "0000000001", "scheduledFilmId": "1000000658"},
        )

    def test_filmhouse_extracts_films_and_sessions(self) -> None:
        html = """
          <div class="jacro-event movie-tabs row">
            <a href="http://filmhouse.sg/film/109/the-voice-of-hind-rajab">
              <img src="https://example.com/poster.jpg">
            </a>
            <a class="liveeventtitle" href="http://filmhouse.sg/film/109/the-voice-of-hind-rajab">
              The Voice of Hind Rajab
            </a>
            <div class="running-time">
              <span>2025</span><span>89mins</span><span>(R21)</span><span>Thriller/Suspense</span>
            </div>
            <p><em><strong>In Arabic with English Subtitles.</strong></em></p>
            <ul class="performance-list-items">
              <div class="heading">Sunday 14th June</div>
              <li>
                <a href="https://filmhouse.sg/filmhouse-singapore/booknow/1091" class="film_book_button">
                  <span class="time">8:30 pm</span>
                </a>
              </li>
            </ul>
          </div>
        """

        parsed = parse_filmhouse_films(html)

        self.assertEqual(parsed[0]["id"], "109")
        self.assertEqual(parsed[0]["title"], "The Voice of Hind Rajab")
        self.assertEqual(parsed[0]["sessions"][0]["sessionId"], "1091")
        self.assertEqual(parsed[0]["sessions"][0]["date"], "Sunday 14th June")
        self.assertEqual(parsed[0]["sessions"][0]["time"], "8:30 pm")

    def test_sfs_extracts_session_lines_with_optional_comma(self) -> None:
        html = """
          <meta content="Thurs 18 Jun, 7.30pm (SATURDAY NIGHT FEVER)"/>
          <meta content="Sat 20 Jun 7.30pm (BLUE VELVET)"/>
        """

        self.assertEqual(
            parse_sfs_session_lines(html),
            [
                {
                    "day": "18",
                    "month": "Jun",
                    "time": "7.30pm",
                    "filmTitle": "SATURDAY NIGHT FEVER",
                },
                {
                    "day": "20",
                    "month": "Jun",
                    "time": "7.30pm",
                    "filmTitle": "BLUE VELVET",
                },
            ],
        )


if __name__ == "__main__":
    unittest.main()
