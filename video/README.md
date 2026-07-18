# Startline Video

Internal tool for creating animated promo videos with [Remotion](https://remotion.dev) v4.

## Quick start

```bash
cd video
npm install
npm run dev          # Studio on :3001
npm run render       # render StartlineDemo to out/startline-demo.mp4
npm run still        # capture frame 30 as still image
```

The product demo (`StartlineDemo`) is the default composition — open it in Studio to preview, edit scenes, and tweak timings.

## Project structure

```
video/
├── src/
│   ├── index.ts        # Entry point (registerRoot)
│   ├── Root.tsx        # Register compositions here
│   ├── Video.tsx       # Scene list + orchestration (sequences, overlap)
│   ├── scenes/         # Individual scenes (one per screen)
│   │   ├── Intro.tsx
│   │   ├── Stats.tsx
│   │   └── ...
│   └── lib/
│       ├── colors.ts   # Brand tokens matching app's theme
│       ├── fonts.ts    # Chakra Petch + Inter via Google Fonts
│       └── transition.ts # Animation helpers
├── out/                # Rendered MP4 output (gitignored)
└── package.json
```

## Create a new video

### 1. Add a new composition in `Root.tsx`

```tsx
<Composition
  id="MyNewVideo"
  component={MyVideo}
  durationInFrames={TOTAL_FRAMES}
  fps={30}
  width={1920}
  height={1080}
/>
```

### 2. Create scenes

Each scene is a React component receiving `{ durationInFrames: number }`.

```tsx
// src/scenes/MyScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../lib/colors';
import { useSceneTransition, fadeUp, fadeIn } from '../lib/transition';
import { FONT_HEADLINE } from '../lib/fonts';

export const MyScene: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance/exit animation (cross-fades with adjacent scenes)
  const scene = useSceneTransition(frame, fps, durationInFrames);

  // Individual element animations
  const title = fadeUp(frame, fps, 10, 32);
  const sub   = fadeIn(frame, fps, 30);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.darker,
        transform: `translateX(${scene.translateX}px) scale(${scene.scale})`,
        opacity: scene.opacity,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT_HEADLINE,
          fontSize: 80,
          color: C.light,
          opacity: title.opacity,
          transform: `translateY(${title.translateY}px)`,
        }}
      >
        My Scene
      </div>
    </AbsoluteFill>
  );
};
```

### 3. Wire scenes together in a video component

Follow the pattern in `Video.tsx`:

```tsx
import { AbsoluteFill, Sequence } from 'remotion';
import { MyScene } from './scenes/MyScene';

const OVERLAP = 18; // cross-fade window between scenes

interface SceneDef { Scene: React.FC<{ durationInFrames: number }>; duration: number }

const SCENES: SceneDef[] = [
  { Scene: MyScene, duration: 120 }, // 4s at 30fps
];

function buildStarts(scenes: SceneDef[], overlap: number): number[] {
  const starts: number[] = []; let t = 0;
  for (const s of scenes) { starts.push(t); t += s.duration - overlap; }
  return starts;
}

const SCENE_STARTS = buildStarts(SCENES, OVERLAP);
export const TOTAL_FRAMES = SCENE_STARTS[SCENE_STARTS.length - 1] + SCENES[SCENES.length - 1].duration;

export const MyVideo: React.FC = () => (
  <AbsoluteFill>
    {SCENES.map(({ Scene, duration }, i) => (
      <Sequence key={i} from={SCENE_STARTS[i]} durationInFrames={duration}>
        <Scene durationInFrames={duration} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
```

### 4. Register in `Root.tsx`

Add your composition alongside `StartlineDemo`.

### 5. Render

```bash
npx remotion render MyNewVideo out/my-video.mp4 --codec h264
```

Or use the Studio's built-in "Render" button.

## Animation reference

All helpers in `lib/transition.ts`:

| Helper | Effect | Params |
|---|---|---|
| `useSceneTransition(frame, fps, duration)` | Full-scene entrance (slide+fade) + exit | overlap=18 |
| `fadeUp(frame, fps, delay, distance)` | Element fades in and slides up | distance=28 |
| `fadeIn(frame, fps, delay)` | Element fades in | — |
| `scaleIn(frame, fps, delay)` | Element scales up from 0.88 | — |
| `countUp(frame, target, start, end)` | Number counts from 0 to target | — |

## Brand tokens

Colors at `lib/colors.ts` — matches the app's `globals.css`:

| Token | Hex | Usage |
|---|---|---|
| `C.primary` | `#B3E153` | Signal green accent |
| `C.darker` | `#141414` | Background |
| `C.dark` | `#1f1f1f` | Card/surface |
| `C.light` | `#F5F7FA` | Primary text |
| `C.muted` | `#8A8F98` | Secondary text |

Fonts: **Chakra Petch** (headlines, uppercase, wide tracking) and **Inter** (body). Pre-loaded in `lib/fonts.ts`, imported via `FONT_HEADLINE` / `FONT_BODY`.

## Conventions

- Use `useCurrentFrame()` + `interpolate()` — no CSS transitions or `@keyframes` (Remotion doesn't support them)
- Background: `C.darker` with optional radial glow (`rgba(179,225,83, 0.06-0.12)`)
- Scan-grid overlay optional but on-brand
- Text on `C.primary` uses `C.darker` (dark ink), never white
- Render at 1920×1080, 30fps, H.264
- Empty background decoration: corner brackets (HUD style, see `CTA.tsx`)
- Each scene gets ~105-135 frames (3.5-4.5s) with 18-frame overlap

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Open Studio (localhost:3001) |
| `npm run render` | Render StartlineDemo to MP4 |
| `npm run still` | Capture a single frame |
| `npx remotion compositions` | List all registered compositions |
| `npx remotion render <id> <path>` | Render a specific composition |
