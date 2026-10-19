"""Long-Running Agents — the SCENES: one picture per chapter in which the cast interacts,
and the interaction IS the chapter's idea (her note, 2026-10-18: "stage 上可以用 Nano Banana
生成一些动物们互动的图片,互动根据环节的内容而定").

    /usr/bin/python3 scenes.py              every scene, one candidate each
    /usr/bin/python3 scenes.py graph 2      one scene, two candidates

Same register as gen.py (Agent Valley's style string, seeded with Valley's style refs); the
seed also carries this show's own cast portraits so the raccoon, the hedgehog, the rooster,
the sloth, the capybara, the goat and the lamb stay the same figurines, and the forecourt
diorama so the place stays the same. 3:2 for the stage (540×372 on the page). No text in
any image — the bubble, the plate and the numbers are HTML on top.
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
ART = HERE.parent / "site" / "public" / "art"            # the cast as the page serves it
OUT = Path(os.environ.get("SCENES_OUT") or (ART / "scenes"))
VALLEY = Path.home() / "Documents/agent101-live/promo/images"
REFS = [VALLEY / "style-refs" / "cat.png", VALLEY / "cast" / "nix.png", VALLEY / "districts" / "market.jpg"]
CAST = [ART / f"{n}.jpg" for n in ("rook", "sleeper", "clock", "sam", "capy", "boxoffice", "lamb", "forecourt")]

STYLE = (
    "Cute low-poly art style — faceted geometric shapes with soft flat shading, in the "
    "gentle Monument Valley / Alto's Odyssey aesthetic. Big soft expressive eyes, sweet "
    "friendly faces, warm pastel colours, soft gradient light, a tiny self-contained scene "
    "floating on a plain soft pastel background. Match the art style of the reference images "
    "exactly. No text, no letters, no numbers, no logos, no symbols."
)

INTRO = (
    "These reference images are the art style I want matched exactly: tiny kawaii low-poly "
    "figurines with heads about half of the whole figure, very big round glossy eyes with bright "
    "highlights, soft round blushing cheeks, tiny bodies and paws. The later references are THIS "
    "show's own cast, which every scene must reuse as the same figurines: a small grey raccoon with "
    "a dark mask and a tiny sky-blue scarf (the agent); a little hedgehog in a striped cream "
    "nightcap (the person, usually asleep); a plump yellow rooster chick with a soft red comb "
    "holding a small round brass alarm clock (the clock); a sleepy little sloth hugging a blank "
    "pastel calendar page (Sam, the friend); a small round capybara in a mint cap with a blank "
    "clipboard and a whistle (the dispatcher); a small cream goat with round glasses and a mint "
    "visor holding a little wooden rubber stamp (the box office); a fluffy cream lamb holding a "
    "tiny blank envelope. The last reference is the place: the forecourt outside a small round "
    "concert arena on a bright presale morning — pastel sky blue fading to peach, warm sand "
    "ground, a blank switched-off marquee, a box-office window with a mint awning, a queue lane "
    "of coral-red velvet-rope posts, a little lamp post, and across a tiny street a small pastel "
    "house with one window whose curtains are drawn.\n\n"
    "Every scene I ask for is wide (3:2), with two or three of these figurines drawn LARGE and "
    "prominent in the middle band of the frame, interacting with each other, the sky calm and "
    "plain in the upper part of the frame and the ground plain along the bottom edge. No "
    "lanterns, no night sky, no stars."
)


def scene(desc: str) -> str:
    return (f"A wide scene in this show's forecourt, the figurines large and prominent in the middle "
            f"band, calm plain pastel sky above, plain ground along the bottom edge. {desc} {STYLE}")


SCENES = {
    # I · the clock — nothing runs between messages; a clock has to wake it
    "clock": scene(
        "The small grey raccoon dozes sitting on a little pastel bench beside the coral rope posts, "
        "eyes closed, the scarf tucked up; the plump rooster chick stands right next to it on tiptoe, "
        "holding its brass alarm clock up high, mid-crow, cheeks puffed; the raccoon's one eye is just "
        "opening. Across the street the hedgehog's window is dark with the curtains drawn."),
    # II · where a fact lives — the fact is in a little book, not in the air
    "memory": scene(
        "The small grey raccoon sits on the sand reading a tiny open pastel notebook held in both "
        "paws, bright-eyed; the sleepy sloth sits beside it hugging its blank calendar page and "
        "pointing one claw at the notebook with a gentle smile, leaning in close; a small stack of "
        "three tiny pastel boxes of different sizes sits next to them."),
    # III · the kill — the lights go out, the ticket survives
    "kill": scene(
        "A close-up: the small grey raccoon and the small round capybara dispatcher in the mint cap "
        "fill most of the frame's height, standing together in the queue lane with a coral rope post "
        "between them; the raccoon holds its single coral ticket stub tight to its chest with both "
        "paws, calm and sure; the capybara lifts the rope for it with one paw and holds its clipboard "
        "in the other, nodding; behind them the arena's blank marquee is switched off and the little "
        "lamp post is dark."),
    # IV · old news — the old seat map is a lie; a little gate stands before the window
    "stale": scene(
        "The small grey raccoon holds up a slightly crumpled blank pastel sheet with both paws, "
        "looking puzzled; in the box-office window with the mint awning the small cream goat with "
        "round glasses and the mint visor shakes her head kindly and holds up a small blank pastel "
        "sign; between the raccoon and the window stands a tiny low mint-green garden gate, closed."),
    # V · the graph — the dispatcher sets the order; the raccoon waits on a stone; the clock taps
    "graph": scene(
        "A close-up: a short path of five round pastel stepping stones crosses the sand toward the "
        "box-office window with the mint awning; the small grey raccoon stands LARGE on the middle "
        "stone, filling much of the frame's height, waiting patiently behind a tiny coral rope, "
        "holding its coral ticket stub; beside the first stone the small round capybara dispatcher in "
        "the mint cap points along the path with its clipboard; the plump rooster chick perches on "
        "the lamp post just behind them with its brass alarm clock, about to crow."),
    # VI · the budget — the person is awake; the agent asks before it spends
    "budget": scene(
        "The little hedgehog in the striped nightcap is awake and leaning out of the small house's "
        "open window, holding a tiny blank pastel phone, looking down with big eyes; below the window "
        "the small grey raccoon looks up holding a tiny pastel coin purse open in both paws, asking; "
        "the sleepy sloth stands beside the raccoon hugging its calendar page."),
    # VII · breakfast — the message read over breakfast
    "breakfast": scene(
        "A close-up in morning sun: the little hedgehog in the striped nightcap sits LARGE at a tiny "
        "round breakfast table outside the small house, filling much of the frame's height, a small "
        "mug on the table and a tiny blank pastel phone held in both paws, delighted; the small grey "
        "raccoon stands beside the table holding up two coral ticket stubs proudly; the plump rooster "
        "chick sits on the table top beside the mug hugging its brass alarm clock, pleased with itself."),
}


def main() -> int:
    args = sys.argv[1:]
    which = [a for a in args if a in SCENES] or list(SCENES)
    n = int(next((a for a in args if a.isdigit()), os.environ.get("N", "1")))
    OUT.mkdir(exist_ok=True)
    client = genai.Client(api_key=KEY)
    chat = client.chats.create(model="gemini-3-pro-image",
                               config=GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]))
    seed = [Part.from_bytes(data=p.read_bytes(), mime_type="image/png" if p.suffix == ".png" else "image/jpeg")
            for p in REFS + [c for c in CAST if c.exists()]]
    chat.send_message(seed + [Part.from_text(text=INTRO)])
    for name in which:
        for i in range(n):
            msg = SCENES[name] if i == 0 else ("Another take on the same scene — same world, same figurines, "
                                                "a different composition. " + STYLE)
            try:
                resp = chat.send_message(msg, config=GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"], image_config=ImageConfig(aspect_ratio="3:2")))
            except Exception as e:  # noqa: BLE001 — one failure should not cost the set
                print("error for", name, "—", str(e)[:200], flush=True)
                continue
            got = 0
            for part in resp.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    out = OUT / (f"{name}.jpg" if i == 0 else f"{name}-{i}.jpg")
                    out.write_bytes(part.inline_data.data)
                    print("wrote", out.name, len(part.inline_data.data), "bytes", flush=True)
                    got += 1
            if not got:
                print("no image for", name, "—", (resp.text or "")[:200], flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
