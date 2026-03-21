# Video Marketing Runbook (Veo)

Last updated: March 21, 2026

Use this runbook to generate Grospace marketing videos with Veo without relying on memory.

## Scope

- Generate text-to-video marketing clips.
- Anchor output to real Grospace visuals using image/reference inputs.
- Extend or interpolate clips when needed.

Primary script:

- [`../scripts/generate-veo-marketing-video.sh`](../scripts/generate-veo-marketing-video.sh)

## Prerequisites

1. Have a valid Gemini API key (Google AI Studio key).
2. Ensure `curl` and `jq` are installed.
3. From repo root:
   - `cd /Users/zdream/code/garden-assistant`

## One-Time Key Setup

Set for current shell:

```bash
export GEMINI_API_KEY='your_real_key'
```

Persist in zsh:

```bash
echo "export GEMINI_API_KEY='your_real_key'" >> ~/.zshrc
source ~/.zshrc
```

Validate key:

```bash
curl -sS "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
  | jq '.error // {ok:true, firstModel:(.models[0].name // null)}'
```

## Model Options

- `veo-3.1-generate-preview`: highest quality (default in script).
- `veo-3.1-fast-generate-preview`: faster/cheaper iteration.
- `veo-3.0-generate-001`, `veo-3.0-fast-generate-001`: stable Veo 3 alternatives.
- `veo-2.0-generate-001`: legacy fallback.

## Core Usage

Default generation:

```bash
./scripts/generate-veo-marketing-video.sh
```

Fast iteration:

```bash
MODEL=veo-3.1-fast-generate-preview RESOLUTION=720p ./scripts/generate-veo-marketing-video.sh
```

## Media-Accurate Generation (Recommended)

Use real Grospace screenshots/assets to reduce “fictional app” drift.

### Inputs Supported

- `INPUT_IMAGE_PATH`: first-frame anchor image.
- `LAST_FRAME_IMAGE_PATH`: ending-frame anchor (requires `INPUT_IMAGE_PATH`).
- `REFERENCE_IMAGE_PATHS`: comma-separated image paths (max 3).
- `EXTEND_VIDEO_PATH`: extend a prior Veo-generated clip.
- `PROMPT_TEXT` or `PROMPT_FILE`.

### Example: Brand-anchored scene

```bash
MODEL=veo-3.1-generate-preview \
INPUT_IMAGE_PATH=/absolute/path/grospace-dashboard.png \
REFERENCE_IMAGE_PATHS="/absolute/path/grospace-dashboard.png,/absolute/path/grospace-events.png" \
PROMPT_FILE=/absolute/path/scene-01.txt \
./scripts/generate-veo-marketing-video.sh
```

### Example: Interpolation (controlled transition)

```bash
INPUT_IMAGE_PATH=/absolute/path/frame-start.png \
LAST_FRAME_IMAGE_PATH=/absolute/path/frame-end.png \
PROMPT_TEXT="Smooth cinematic transition from dashboard overview to events workflow." \
./scripts/generate-veo-marketing-video.sh
```

### Example: Extension

```bash
EXTEND_VIDEO_PATH=/absolute/path/previous-veo-output.mp4 \
RESOLUTION=720p \
DURATION_SECONDS=8 \
PROMPT_TEXT="Continue the motion naturally and end on Grospace call-to-action." \
./scripts/generate-veo-marketing-video.sh
```

## Dry Run / Payload Inspection

Print the final API payload without calling Veo:

```bash
DRY_RUN=1 \
INPUT_IMAGE_PATH=/absolute/path/frame.png \
PROMPT_TEXT="Test payload only" \
./scripts/generate-veo-marketing-video.sh
```

## Script Constraints Enforced

- `1080p`/`4k` require `DURATION_SECONDS=8`.
- Reference images require `DURATION_SECONDS=8`.
- Extension requires:
  - `RESOLUTION=720p`
  - `DURATION_SECONDS=8`
  - no `INPUT_IMAGE_PATH`, `LAST_FRAME_IMAGE_PATH`, or `REFERENCE_IMAGE_PATHS`.
- `LAST_FRAME_IMAGE_PATH` requires `INPUT_IMAGE_PATH`.
- Reference images capped at 3.

## Prompt Pattern (High-Quality Marketing)

Include all of:

1. Subject/context (Grospace + real setting)
2. Action (what changes over time)
3. Style (cinematic direction)
4. Camera/composition (shot language)
5. Focus/lens/lighting
6. Audio cues (dialogue in quotes + SFX + ambience)

Tip: Generate scenes separately and stitch in post for better control of narrative and overlays.

## Output Handling

By default outputs are saved in `./tmp/veo/`.

Move final videos outside the repo to avoid clutter:

```bash
mkdir -p "$HOME/Videos/Grospace"
mv ./tmp/veo/*.mp4 "$HOME/Videos/Grospace/"
```

## Troubleshooting

`API_KEY_INVALID`:

- Wrong key type or bad key value. Use a Gemini key from AI Studio and reset env var.

`durationSeconds needs to be a number`:

- Update script from repo; this has been fixed in current version.

Generation blocked/safety error:

- Revise prompt and retry.
- For audio-related blocks, simplify or remove sensitive dialogue/SFX cues.

No video URI after completion:

- Inspect operation JSON response for error details and retry.

## Security Note

Do not paste API keys into chat, tickets, or committed files. If exposed, rotate immediately.
