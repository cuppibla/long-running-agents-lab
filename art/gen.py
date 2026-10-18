"""The show's art — the Nano Banana pattern, copied from Table for N.

    /usr/bin/python3 art/gen.py              every piece, one candidate each
    /usr/bin/python3 art/gen.py hero 2       one piece, two candidates

ONE chat session, seeded with reference images (REFS) and a STYLE note, then
every piece asked for in turn so the set matches itself. Output lands in
site/public/art/ under the piece's name. Art is text-free on purpose; the
page sets the type.

The key is read from ~/Documents/agentic-handbook/.env (GOOGLE_API_KEY); the
script never prints it. Reference images are optional: drop JPEGs in
art/refs/ and they seed the chat; with none, the STYLE note alone does.

CHANGE ME (the show): STYLE and PIECES. Keep the recipe.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

os.environ.pop("GOOGLE_GENAI_USE_VERTEXAI", None)
KEY = re.search(r"GOOGLE_API_KEY=(\S+)",
                Path.home().joinpath("Documents/agentic-handbook/.env").read_text()).group(1)

from google import genai
from google.genai.types import GenerateContentConfig, ImageConfig, Part

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "site" / "public" / "art"
REFS = sorted((HERE / "refs").glob("*.jpg")) if (HERE / "refs").exists() else []
MODEL = "gemini-3-pro-image"

STYLE = (
    # CHANGE ME — the house register. Say what stays the same across every piece,
    # the palette, the light, and what must never appear.
    "Soft low-poly 3D, faceted papercraft-felt surfaces, round friendly animal characters with "
    "big kind eyes, gentle diffused daylight, one subject centred, plain soft gradient backdrop. "
    "The show is a small lab with a front door on a quiet street in the late afternoon. Its "
    "palette is linen cream, olive green, tomato red, mustard yellow and walnut wood. "
    "No lanterns, no violet, no night sky. Never put text, numbers, letters or symbols in the "
    "image; signs, screens and cards stay blank."
)

PORTRAIT = ("A single character portrait: one figure, centred, chest-up, filling most of the "
            "square, plain linen-cream gradient backdrop, nothing else in frame. ")

PIECES = {
    # CHANGE ME — one entry per file the page references (site/public/art/README.md)
    "greeter": dict(ratio="1:1", prompt=PORTRAIT + (
        "The greeter at the door: a low-poly russet fox in an olive cardigan with a small brass "
        "key on a cord around its neck, one paw raised in a wave, warm and welcoming. No text.")),
    "hero": dict(ratio="16:9", prompt=(
        "A wide scene from a slightly raised three-quarter angle: the lab's front door, a walnut "
        "door with a round window set in a linen-cream wall, a mustard awning above it, two potted "
        "olive trees beside it, and the fox greeter standing on the step with a paw on the handle, "
        "looking at the camera. Late-afternoon light, a plain calm sky across the upper third. "
        "Keep the lower middle of the frame calm and open. No text, no signage, no numbers.")),
    "lamp": dict(ratio="1:1", prompt=(
        "A single small brass desk lamp with a linen shade, lit, on a walnut shelf, seen straight "
        "on, plain linen-cream gradient backdrop. Same low-poly papercraft register. No text.")),
}


def main() -> int:
    args = sys.argv[1:]
    which = [args[0]] if args else list(PIECES)
    n = int(args[1]) if len(args) > 1 else 1
    OUT.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=KEY)
    chat = client.chats.create(model=MODEL, config=GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]))
    seed = [Part.from_bytes(data=p.read_bytes(), mime_type="image/jpeg") for p in REFS]
    chat.send_message(seed + [Part.from_text(text=STYLE)])
    print("seeded with", len(seed), "refs", flush=True)
    for name in which:
        spec = PIECES[name]
        for i in range(n):
            msg = spec["prompt"] if i == 0 else "Another take on the same brief — same show, same subject, a different pose."
            try:
                resp = chat.send_message(msg, config=GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"], image_config=ImageConfig(aspect_ratio=spec["ratio"])))
            except Exception as e:  # noqa: BLE001 — one failure must not cost the set
                print("error for", name, "—", str(e)[:200], flush=True)
                continue
            got = 0
            for part in resp.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    out = OUT / (f"{name}.jpg" if i == 0 else f"{name}-{i}.jpg")
                    out.write_bytes(part.inline_data.data)
                    print("wrote", out.relative_to(HERE.parent), len(part.inline_data.data), "bytes", flush=True)
                    got += 1
            if not got:
                print("no image for", name, "—", (resp.text or "")[:200], flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
