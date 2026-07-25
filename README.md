# MascotAI

Animated SVG mascot studios for web and mobile apps — the same craft as **Lyra**, **Sol**, **Bud**, and **Fanous**.

## Setup

```bash
npm install
cp .env.local.example .env.local   # add OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` — landing + example gallery
- `/studio/lyra` · `/studio/sol` · `/studio/bud` · `/studio/fanous` — interactive example studios
- `/create` — describe a mascot, pick gestures, generate + download SVG
- `POST /api/generate` — two-pass Lyra-craft generation via **GPT-5.6 Sol** (Responses API, high reasoning)

## Generation

1. Character bible (product metaphor + instrument anatomy)
2. Full SVG studio pack in Lyra’s engineering style (`ms-eyes`, `ms-signal-fan`, SMIL bounce, spectrogram ramp)

Set in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MASCOT_MODEL=gpt-5.6-sol
```

If the OpenAI project lacks Sol access, the API automatically falls back to `gpt-5.5` → `gpt-5.4`.

## Notes

- Example studios live in `src/components/mascots/` (ported from the original root JSX files).
- Never commit `.env.local`.
