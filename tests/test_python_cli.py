import subprocess
import sys
import unittest


class PythonCliTest(unittest.TestCase):
    def test_module_cli_exposes_etl_commands(self) -> None:
        result = subprocess.run(
            [sys.executable, "-m", "pyetl", "--help"],
            check=False,
            text=True,
            capture_output=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("scrape", result.stdout)
        self.assertIn("transform", result.stdout)
        self.assertIn("storage", result.stdout)


if __name__ == "__main__":
    unittest.main()
