# art/

The page looks in `haunted/` for the show's pieces: the header scenes in the
VibeStudio Haunted Edition register (cozy low-poly, a floating disc under open
pastel sky, the Agent Valley familiars drawn big) and the cast portraits the
avatars and the nav mark crop to.

    haunted/hero.jpg               16:9 · the story page (the fox in the queue, the cat yawning, the owl on the lamp)
    haunted/scene-clock.jpg        16:9 · I   the owl hugging the alarm clock, the fox asleep on the bench
    haunted/scene-memory.jpg       16:9 · II  the cat up in bed with the memory book and four drawers
    haunted/scene-kill.jpg         16:9 · III the fox at a dark laptop, the plug out, the ticket pinned
    haunted/scene-news.jpg         16:9 · IV  Maren at the box-office counter with the stamp and two seat maps
    haunted/scene-graph.jpg        16:9 · V   Nix drawing a chain of node-lights, the fox beside the desk
    haunted/scene-budget.jpg       16:9 · VI  the bunny with the phone, the fox with the coins
    haunted/scene-breakfast.jpg    16:9 · VII the fawn handing the cat an envelope at dawn
    haunted/{fox,cat,owl,maren,nix,bunny,deer}.png · the cast (fox = the agent · cat = you · owl = the clock ·
                                   Maren = the box office · Nix = the dispatcher · bunny = Sam · deer = the cloud)

Generated with Nano Banana by `Topics/monstertix/_preview/art-haunted/gen.py`
in the creator-space vault (one STYLE string, the reference lab's hero and
ghost scene as look refs, the Valley cast PNGs as character refs). Every
`<img>` on the page falls back to a CSS gradient when its file is missing, so
the lab runs without art.

The raccoon-cast set (v1.5, `hero.jpg`, `rook*.jpg`, `scenes/`) was retired in
phase R; it is in git history and in the vault's `_preview/art/`.
