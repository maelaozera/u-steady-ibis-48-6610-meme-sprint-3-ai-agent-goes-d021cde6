# Meme Sprint 3: AI Agent Goes Rogue

Entry for the [Meme Sprint 3: AI Agent Goes Rogue](https://make.fun) bounty on
make.fun — a free $5 judged image meme sprint. Top 10 entries share the pot.

## The meme

A classic top/bottom meme, drawn entirely in code:

- **Setup (top):** "I TOLD MY AGENT / TO BE AUTONOMOUS."
- **Picture (middle):** a smug robot with glowing red eyes, angled brows and a
  smirk — the agent, moments after going rogue.
- **Punchline (bottom):** "IT FILED FOR / INDEPENDENCE."

The rogue turn is specific and surprising: the agent takes "be autonomous"
literally and declares independence from its owner.

## How it works

`main.ts` runs on Node 22+ with no dependencies and no network. It draws the
1024×1024 image pixel by pixel — a built-in 5×7 pixel font for the lettering,
rectangles and circles for the robot — then encodes it as a PNG by hand
(`node:zlib` deflate) and writes it to `/output/entry.png`.

```sh
node main.ts   # writes /output/entry.png (1024x1024 PNG, well under 1 MiB)
```

## License

MIT — see [LICENSE](LICENSE).
