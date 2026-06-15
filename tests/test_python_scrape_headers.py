import unittest

from pyetl.scrape import build_default_headers, build_gv_headers


class PythonScrapeHeadersTest(unittest.TestCase):
    def test_gv_headers_include_browser_identity_required_by_api(self) -> None:
        headers = build_gv_headers("https://www.gv.com.sg/GVMovies")

        self.assertIn("User-Agent", headers)
        self.assertIn("sec-ch-ua", headers)
        self.assertEqual(headers["x_developer"], "ENOVAX")

    def test_default_headers_include_browser_user_agent(self) -> None:
        self.assertIn("User-Agent", build_default_headers())


if __name__ == "__main__":
    unittest.main()
