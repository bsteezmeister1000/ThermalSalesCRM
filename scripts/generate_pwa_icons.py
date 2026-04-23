from __future__ import annotations

import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUT_192 = ROOT / "public" / "icon-192.png"
OUT_512 = ROOT / "public" / "icon-512.png"


def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + chunk_type
        + data
        + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
    )


def build_icon(size: int) -> bytes:
    bg = (20, 86, 79, 255)
    fg = (244, 230, 202, 255)
    accent = (225, 107, 42, 255)

    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            pixel = bg

            inset = size // 8
            if inset < x < size - inset and inset < y < size - inset:
                pixel = (24, 102, 94, 255)

            cx = size // 2
            if abs(x - cx) < size // 18:
                pixel = fg
            if size // 4 < y < size // 4 + size // 14 and size // 4 < x < size - size // 4:
                pixel = fg
            if size // 2 < y < size // 2 + size // 14 and size // 3 < x < size - size // 3:
                pixel = fg
            if y > size * 0.68 and x > size * 0.58:
                if (x - size * 0.58) + (y - size * 0.68) < size * 0.34:
                    pixel = accent

            row.extend(pixel)
        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, level=9)
    header = b"\x89PNG\r\n\x1a\n"
    ihdr = png_chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    idat = png_chunk(b"IDAT", compressed)
    iend = png_chunk(b"IEND", b"")
    return header + ihdr + idat + iend


def main() -> None:
    OUT_192.write_bytes(build_icon(192))
    OUT_512.write_bytes(build_icon(512))
    print("Generated PWA icons.")


if __name__ == "__main__":
    main()
