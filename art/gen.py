"""Queue for Two — the cast, in the AGENT VALLEY register.

    /usr/bin/python3 gen.py              every piece, one candidate each
    /usr/bin/python3 gen.py rook 2       one piece, two candidates

v3 (2026-10-17, her note: "对照 agent valley 的风格,不是 table for n 的;动物更可爱").
What changed from v1/v2: the seed is Valley's own four style refs (fox · cat · owl · dragon,
promo/images/style-refs/), the style string is Valley's shared string verbatim
(promo/prompts/image-prompts.md §0), characters are chibi figurines with ONE tiny
accessory (not chest-up portraits with props in both hands), and places are Valley's
"tiny self-contained scene floating on a plain soft pastel background" dioramas.
Valley's rule, kept: conditioning beats instruction — "match the art style of the
reference images exactly", no adjective pile-ups, no negative constraints about faces.

The show itself stays: a bright early morning outside a tiny concert arena on presale
day; sky blue · peach · sand · sun gold · ticket coral · mint. Earlier sets: night/ (v1),
morning-v1/ (v2, Table-for-N register).
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
VALLEY = Path.home() / "Documents/agent101-live/promo/images"
# v4 (her note: 图片不够可爱): seed with Valley's CUTEST pieces — the glossy-eyed cat, Nix, the fox —
# and say the proportions out loud (head ≈ half the height, huge glossy eyes, tiny body).
REFS = [VALLEY / "style-refs" / "cat.png", VALLEY / "cast" / "nix.png", VALLEY / "cast" / "fox.png",
        VALLEY / "style-refs" / "dragon.png", VALLEY / "cast" / "bunny.png"]
# Valley's market diorama shows the model what a PLACE looks like in this register
PLACE_REF = VALLEY / "districts" / "market.jpg"
REFS += [p for p in (HERE / "rook.jpg", HERE / "sleeper.jpg", HERE / "clock.jpg") if p.exists()]

# Valley's shared style string, verbatim (promo/prompts/image-prompts.md §0), minus the cloud
STYLE = (
    "Cute low-poly art style — faceted geometric shapes with soft flat shading, in the "
    "gentle Monument Valley / Alto's Odyssey aesthetic. Big soft expressive eyes, a sweet "
    "friendly face, warm pastel colours, soft gradient light, plain pastel background, "
    "centered, charming and adorable. Match the art style of the reference images exactly. "
    "No text, no letters, no logos."
)
# Valley's diorama variant of the string (§2): the scene floats on pastel
DIORAMA = (
    "Cute low-poly art style — faceted geometric shapes with soft flat shading, in the "
    "gentle Monument Valley / Alto's Odyssey aesthetic, warm pastel colours, soft gradient "
    "light, a tiny self-contained scene floating on a plain soft pastel background, a few "
    "puffy low-poly clouds. Match the art style of the reference images exactly. "
    "No text, no letters, no logos."
)

INTRO = (
    "These reference images are the art style I want matched exactly: tiny kawaii low-poly "
    "figurines. Note the proportions — the head is about half of the whole figure, the eyes "
    "are very big, round and glossy with bright highlights, the cheeks are soft and round, the "
    "body and paws are tiny, the smile is sweet. The last image shows how a little place looks "
    "in this style — a tiny diorama floating on pastel, with the characters large and prominent.\n\n"
    "The world for everything I ask next: a bright early morning outside a small round concert "
    "arena on the day a presale opens. Pastel sky blue fading to peach, warm sand ground, a blank "
    "switched-off marquee, a tiny box-office window with a mint awning, a queue lane of little "
    "coral-red velvet-rope posts, and across a tiny street a small pastel house with one window "
    "whose curtains are still drawn. No lanterns, no night, no stars."
)

def figure(desc: str) -> str:
    return (f"A single tiny kawaii low-poly animal figurine, full body, sitting, centered on a plain "
            f"pastel sky-blue-to-peach background, with the exact proportions of the references: head "
            f"about half the figure, very big round glossy eyes with bright highlights, soft round "
            f"cheeks with a hint of blush, tiny body and paws, a sweet smile. {desc} {STYLE}")

PIECES = {
    # the agent — a little raccoon, one accessory: a coral ticket stub
    "rook": dict(ratio="1:1", prompt=figure(
        "A small grey raccoon with a dark mask, a tiny sky-blue scarf, holding one little coral-red "
        "ticket stub in its paws, bright and eager.")),
    # you — asleep
    "sleeper": dict(ratio="1:1", prompt=figure(
        "A little hedgehog lying on a tiny white pillow, face toward us, eyes closed as two happy little "
        "arcs, a sweet sleepy smile, wearing a striped cream nightcap, a small sun-gold blanket tucked up to its chin.")),
    # Sam — the friend who never does weeknights
    "sam": dict(ratio="1:1", prompt=figure(
        "A sleepy little sloth with half-closed big eyes and a gentle smile, hugging a tiny blank pastel "
        "calendar page.")),
    # the clock — the triggerer
    "clock": dict(ratio="1:1", prompt=figure(
        "A plump little rooster chick with a soft red comb, holding a small round brass alarm clock with "
        "two bells against its chest, cheerful.")),
    # the box office — the venue, the stamp
    "boxoffice": dict(ratio="1:1", prompt=figure(
        "A small cream goat with tiny curved horns, round glasses and a mint-green visor, holding a little "
        "wooden rubber stamp, patient and kind.")),
    # the stage — the forecourt as a floating diorama, no characters
    "forecourt": dict(ratio="16:9", prompt=(
        "A tiny low-poly diorama of the forecourt outside a small round concert arena on a "
        "bright morning, wide composition: the little arena with a big blank switched-off "
        "marquee panel, a tiny box-office window with a mint-green awning, a winding queue "
        "lane of small coral-red velvet-rope posts on warm sand, a little lamp post, and across "
        "a tiny street a small pastel house with one window whose curtains are drawn. No "
        "characters at all. The diorama sits in the middle of the frame with calm pastel sky "
        "above and plain pastel below. " + DIORAMA)),
    # the hero — the same diorama with the cast in it
    "hero": dict(ratio="16:9", prompt=(
        "The same tiny low-poly diorama of the arena forecourt on a bright morning, wide "
        "composition, now with the cast in it, drawn LARGE and prominent like the characters in the "
        "reference market scene, all with the same big glossy eyes: a line of adorable little animal familiars "
        "(a mole, a frog, a lamb, a badger, a hamster, a few more) waiting in the queue lane "
        "behind the coral rope posts, the small grey raccoon familiar with its sky-blue scarf "
        "near the front holding a coral ticket stub, the plump rooster perched on top of the "
        "lamp post holding its brass alarm clock, the cream goat with glasses and mint visor "
        "in the box-office window, and in the small house across the street the little "
        "hedgehog in a nightcap asleep in the window. Calm pastel sky above. " + DIORAMA)),
    # v5 (her note: one character, very big, very cute, catchy) — close-ups that fill the frame
    "rook-hero": dict(ratio="1:1", prompt=(
        "A close-up of the same small grey raccoon figurine with the dark mask and the tiny sky-blue "
        "scarf, holding one little coral-red ticket stub up proudly with both paws, filling most of the "
        "frame from the chest up, looking straight at us with very big round glossy eyes with bright "
        "highlights, soft round blushing cheeks, a sweet excited smile, on a plain pastel "
        "sky-blue-to-peach background. " + STYLE)),
    "sleeper-awake": dict(ratio="1:1", prompt=(
        "A close-up of the same little hedgehog figurine, now awake and sitting up in bed in the striped "
        "cream nightcap, the sun-gold blanket around its lap, holding a tiny blank pastel phone in both "
        "paws and looking at it with very big round glossy eyes with bright highlights, soft round "
        "blushing cheeks, a sweet surprised smile, filling most of the frame, on a plain pastel "
        "sky-blue-to-peach background. " + STYLE)),
    "clock-hero": dict(ratio="1:1", prompt=(
        "A close-up of the same plump little yellow rooster chick figurine with the soft red comb, hugging "
        "its small round brass alarm clock, filling most of the frame from the chest up, very big round "
        "glossy eyes with bright highlights, soft round blushing cheeks, mid-crow and cheerful, on a plain "
        "pastel sky-blue-to-peach background. " + STYLE)),
    # v6 (her note: a different character on every page, like Valley's familiars)
    "capy": dict(ratio="1:1", prompt=figure(
        "A small round capybara dispatcher who runs the night shift, calm and orderly, with a tiny "
        "mint-green cap, holding a little blank pastel clipboard, a small whistle on a cord around "
        "its neck.")),
    "lamb": dict(ratio="1:1", prompt=figure(
        "A fluffy little cream lamb, round like a small cloud, holding one tiny blank pastel "
        "envelope in both hooves, cheerful and gentle.")),
    "sam-hero": dict(ratio="1:1", prompt=(
        "A close-up of the same sleepy little sloth figurine, hugging its tiny blank pastel calendar "
        "page, filling most of the frame from the chest up, half-closed very big glossy eyes with "
        "bright highlights, soft round blushing cheeks, a gentle smile, on a plain pastel "
        "sky-blue-to-peach background. " + STYLE)),
    "boxoffice-hero": dict(ratio="1:1", prompt=(
        "A close-up of the same small cream goat figurine with the tiny curved horns, round glasses "
        "and mint-green visor, holding up its little wooden rubber stamp, filling most of the frame "
        "from the chest up, very big round glossy eyes with bright highlights, soft round blushing "
        "cheeks, a kind smile, on a plain pastel sky-blue-to-peach background. " + STYLE)),
}


def main() -> int:
    args = sys.argv[1:]
    which = [a for a in args if a in PIECES] or list(PIECES)
    n = int(os.environ.get("N", "1"))
    client = genai.Client(api_key=KEY)
    chat = client.chats.create(
        model="gemini-3-pro-image",
        config=GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]))
    seed = [Part.from_bytes(data=p.read_bytes(), mime_type="image/png" if p.suffix == ".png" else "image/jpeg")
            for p in REFS]
    seed.append(Part.from_bytes(data=PLACE_REF.read_bytes(), mime_type="image/jpeg"))
    chat.send_message(seed + [Part.from_text(text=INTRO)])
    for name in which:
        spec = PIECES[name]
        for i in range(n):
            msg = spec["prompt"] if i == 0 else (
                "Another take on the same brief — same world, same character, a different pose. " + STYLE)
            try:
                resp = chat.send_message(
                    msg, config=GenerateContentConfig(
                        response_modalities=["TEXT", "IMAGE"],
                        image_config=ImageConfig(aspect_ratio=spec["ratio"])))
            except Exception as e:  # keep going; one failure should not cost the set
                print("error for", name, "—", str(e)[:200], flush=True)
                continue
            got = 0
            for part in resp.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    out = HERE / (f"{name}.jpg" if i == 0 else f"{name}-{i}.jpg")
                    out.write_bytes(part.inline_data.data)
                    print("wrote", out.name, len(part.inline_data.data), "bytes", flush=True)
                    got += 1
            if not got:
                print("no image for", name, "—", (resp.text or "")[:200], flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
