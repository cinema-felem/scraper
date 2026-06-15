"""Text normalization helpers shared by transforms."""

from __future__ import annotations

import re
import unicodedata


def remove_escape_characters(raw: str) -> str:
    return raw.replace("\r", " ").replace("\n", " ").replace("\t", " ")


def remove_excess_characters(raw: str) -> str:
    text = raw.replace("*", "").replace("()", " ")
    return re.sub(r" +", " ", text).strip()


def remove_non_ascii_characters(raw: str) -> str:
    return "".join(char for char in raw if ord(char) <= 0x7F)


def asciify(raw: str) -> str:
    text = unicodedata.normalize("NFD", raw)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-zA-Z0-9 ]", "", text)


def clean_string(raw: object) -> str:
    text = "" if raw is None else str(raw)
    text = remove_escape_characters(text)
    text = remove_non_ascii_characters(text)
    text = remove_excess_characters(text)
    return text


def edit_distance(a: str, b: str) -> int:
    a = a.lower().replace(" ", "")
    b = b.lower().replace(" ", "")
    if not a:
        return len(b)
    if not b:
        return len(a)

    previous = list(range(len(a) + 1))
    for row_index, b_char in enumerate(b, start=1):
        current = [row_index]
        for col_index, a_char in enumerate(a, start=1):
            if a_char == b_char:
                current.append(previous[col_index - 1])
            else:
                current.append(
                    min(
                        previous[col_index - 1] + 1,
                        current[col_index - 1] + 1,
                        previous[col_index] + 1,
                    )
                )
        previous = current
    return previous[-1]

