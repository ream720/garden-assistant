#!/usr/bin/env bash

set -euo pipefail

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "${s}"
}

file_mime_type() {
  local file_path="$1"
  local ext="${file_path##*.}"
  ext="$(printf '%s' "${ext}" | tr '[:upper:]' '[:lower:]')"

  case "${ext}" in
    png) echo "image/png" ;;
    jpg|jpeg) echo "image/jpeg" ;;
    webp) echo "image/webp" ;;
    gif) echo "image/gif" ;;
    bmp) echo "image/bmp" ;;
    tiff|tif) echo "image/tiff" ;;
    mp4) echo "video/mp4" ;;
    mov) echo "video/quicktime" ;;
    webm) echo "video/webm" ;;
    *)
      echo "error: unsupported media extension for ${file_path}" >&2
      echo "supported images: png,jpg,jpeg,webp,gif,bmp,tiff,tif" >&2
      echo "supported videos: mp4,mov,webm" >&2
      exit 1
      ;;
  esac
}

inline_data_json() {
  local file_path="$1"
  if [[ ! -f "${file_path}" ]]; then
    echo "error: media file not found: ${file_path}" >&2
    exit 1
  fi

  local mime_type
  mime_type="$(file_mime_type "${file_path}")"
  local base64_data
  base64_data="$(base64 < "${file_path}" | tr -d '\n')"

  jq -nc \
    --arg mimeType "${mime_type}" \
    --arg data "${base64_data}" \
    '{inlineData: {mimeType: $mimeType, data: $data}}'
}

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "error: GEMINI_API_KEY is not set" >&2
  echo "set it and rerun, for example:" >&2
  echo "  export GEMINI_API_KEY='your-key'" >&2
  exit 1
fi

BASE_URL="${BASE_URL:-https://generativelanguage.googleapis.com/v1beta}"
MODEL="${MODEL:-veo-3.1-generate-preview}"
ASPECT_RATIO="${ASPECT_RATIO:-16:9}"
RESOLUTION="${RESOLUTION:-1080p}"
DURATION_SECONDS="${DURATION_SECONDS:-8}"
OUTPUT_DIR="${OUTPUT_DIR:-./tmp/veo}"
OUTPUT_BASENAME="${OUTPUT_BASENAME:-grospace-marketing}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-10}"
MAX_POLLS="${MAX_POLLS:-90}"
DRY_RUN="${DRY_RUN:-0}"
PROMPT_TEXT="${PROMPT_TEXT:-}"
PROMPT_FILE="${PROMPT_FILE:-}"
INPUT_IMAGE_PATH="${INPUT_IMAGE_PATH:-}"
LAST_FRAME_IMAGE_PATH="${LAST_FRAME_IMAGE_PATH:-}"
REFERENCE_IMAGE_PATHS="${REFERENCE_IMAGE_PATHS:-}"
EXTEND_VIDEO_PATH="${EXTEND_VIDEO_PATH:-}"
PERSON_GENERATION="${PERSON_GENERATION:-}"

if [[ ! "${DURATION_SECONDS}" =~ ^[0-9]+$ ]]; then
  echo "error: DURATION_SECONDS must be an integer (4, 6, or 8 for Veo 3.x)" >&2
  exit 1
fi

# 1080p and 4k require 8-second duration according to current Veo constraints.
if [[ "${RESOLUTION}" == "1080p" || "${RESOLUTION}" == "4k" ]]; then
  if [[ "${DURATION_SECONDS}" != "8" ]]; then
    echo "error: RESOLUTION=${RESOLUTION} requires DURATION_SECONDS=8" >&2
    exit 1
  fi
fi

mkdir -p "${OUTPUT_DIR}"
timestamp="$(date +%Y%m%d-%H%M%S)"
output_file="${OUTPUT_DIR}/${OUTPUT_BASENAME}-${timestamp}.mp4"

if [[ -n "${PROMPT_FILE}" && -n "${PROMPT_TEXT}" ]]; then
  echo "error: set either PROMPT_FILE or PROMPT_TEXT, not both" >&2
  exit 1
fi

if [[ -n "${PROMPT_FILE}" ]]; then
  if [[ ! -f "${PROMPT_FILE}" ]]; then
    echo "error: PROMPT_FILE does not exist: ${PROMPT_FILE}" >&2
    exit 1
  fi
  PROMPT="$(cat "${PROMPT_FILE}")"
elif [[ -n "${PROMPT_TEXT}" ]]; then
  PROMPT="${PROMPT_TEXT}"
else
  read -r -d '' PROMPT <<'EOF' || true
A cinematic 8-second product marketing video for the app "Grospace", designed for home growers.
Scene 1 (0-2s): Golden-hour greenhouse and balcony garden. A phone in hand opens Grospace. Clean UI flashes key dashboard tiles: Active Plants, Open Issues, Tasks Due, Total Harvests.
Scene 2 (2-5s): Fast montage of real workflow moments: adding a plant from seedling to harvest timeline, switching between indoor tent and outdoor bed spaces, logging a note with a photo, and creating a recurring care task with a due date.
Scene 3 (5-7s): Unified Events view shows notes and tasks together with smart filters (Issues and Due Soon), then one tap marks a task complete.
Scene 4 (7-8s): Bold end card over lush garden visuals: "Grospace - From seed to harvest, stay on schedule."
Style: premium startup ad, crisp UI overlays, natural green and warm sunlight palette, shallow depth of field, smooth camera motion, subtle film grain.
Audio: uplifting organic electronic beat, soft garden ambience (birds, leaves), clean UI tap sounds.
Voiceover, calm and confident: "Track every plant. Organize every space. Never miss what matters."
EOF
fi

if [[ -n "${LAST_FRAME_IMAGE_PATH}" && -z "${INPUT_IMAGE_PATH}" ]]; then
  echo "error: LAST_FRAME_IMAGE_PATH requires INPUT_IMAGE_PATH" >&2
  exit 1
fi

if [[ -n "${EXTEND_VIDEO_PATH}" ]]; then
  if [[ -n "${INPUT_IMAGE_PATH}" || -n "${LAST_FRAME_IMAGE_PATH}" || -n "${REFERENCE_IMAGE_PATHS}" ]]; then
    echo "error: EXTEND_VIDEO_PATH cannot be combined with INPUT_IMAGE_PATH/LAST_FRAME_IMAGE_PATH/REFERENCE_IMAGE_PATHS" >&2
    exit 1
  fi

  if [[ "${RESOLUTION}" != "720p" ]]; then
    echo "error: EXTEND_VIDEO_PATH requires RESOLUTION=720p" >&2
    exit 1
  fi

  if [[ "${DURATION_SECONDS}" != "8" ]]; then
    echo "error: EXTEND_VIDEO_PATH requires DURATION_SECONDS=8" >&2
    exit 1
  fi
fi

if [[ -n "${REFERENCE_IMAGE_PATHS}" && "${DURATION_SECONDS}" != "8" ]]; then
  echo "error: REFERENCE_IMAGE_PATHS requires DURATION_SECONDS=8" >&2
  exit 1
fi

payload="$(jq -n \
  --arg prompt "${PROMPT}" \
  --arg aspectRatio "${ASPECT_RATIO}" \
  --arg resolution "${RESOLUTION}" \
  --argjson durationSeconds "${DURATION_SECONDS}" \
  '{
    instances: [{ prompt: $prompt }],
    parameters: {
      aspectRatio: $aspectRatio,
      resolution: $resolution,
      durationSeconds: $durationSeconds
    }
  }')"

if [[ -n "${PERSON_GENERATION}" ]]; then
  payload="$(jq \
    --arg personGeneration "${PERSON_GENERATION}" \
    '.parameters.personGeneration = $personGeneration' <<< "${payload}")"
fi

if [[ -n "${INPUT_IMAGE_PATH}" ]]; then
  image_json="$(inline_data_json "${INPUT_IMAGE_PATH}")"
  payload="$(jq \
    --argjson image "${image_json}" \
    '.instances[0].image = $image' <<< "${payload}")"
fi

if [[ -n "${LAST_FRAME_IMAGE_PATH}" ]]; then
  last_frame_json="$(inline_data_json "${LAST_FRAME_IMAGE_PATH}")"
  payload="$(jq \
    --argjson lastFrame "${last_frame_json}" \
    '.instances[0].lastFrame = $lastFrame' <<< "${payload}")"
fi

if [[ -n "${EXTEND_VIDEO_PATH}" ]]; then
  video_json="$(inline_data_json "${EXTEND_VIDEO_PATH}")"
  payload="$(jq \
    --argjson video "${video_json}" \
    '.instances[0].video = $video' <<< "${payload}")"
fi

if [[ -n "${REFERENCE_IMAGE_PATHS}" ]]; then
  reference_images_json='[]'
  reference_count=0
  IFS=',' read -ra raw_reference_paths <<< "${REFERENCE_IMAGE_PATHS}"
  for raw_path in "${raw_reference_paths[@]}"; do
    reference_path="$(trim "${raw_path}")"
    if [[ -z "${reference_path}" ]]; then
      continue
    fi
    reference_image_json="$(inline_data_json "${reference_path}")"
    reference_images_json="$(jq \
      --argjson image "${reference_image_json}" \
      '. + [{image: $image, referenceType: "asset"}]' <<< "${reference_images_json}")"
    reference_count=$((reference_count + 1))
  done

  if [[ "${reference_count}" -eq 0 ]]; then
    echo "error: REFERENCE_IMAGE_PATHS was set but no valid paths were provided" >&2
    exit 1
  fi

  if [[ "${reference_count}" -gt 3 ]]; then
    echo "error: Veo supports up to 3 reference images; provided ${reference_count}" >&2
    exit 1
  fi

  payload="$(jq \
    --argjson referenceImages "${reference_images_json}" \
    '.instances[0].referenceImages = $referenceImages' <<< "${payload}")"
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "dry run payload:"
  echo "${payload}" | jq '.'
  exit 0
fi

echo "starting Veo generation with model: ${MODEL}"
create_response="$(
  curl -sS "${BASE_URL}/models/${MODEL}:predictLongRunning" \
    -H "x-goog-api-key: ${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "${payload}"
)"
operation_name="$(echo "${create_response}" | jq -r '.name // empty')"

if [[ -z "${operation_name}" ]]; then
  echo "error: operation was not created; raw response:" >&2
  echo "${create_response}" >&2
  echo >&2
  exit 1
fi

echo "operation: ${operation_name}"
echo "polling..."

for _ in $(seq 1 "${MAX_POLLS}"); do
  status_response="$(
    curl -sS -H "x-goog-api-key: ${GEMINI_API_KEY}" "${BASE_URL}/${operation_name}"
  )"

  done_flag="$(echo "${status_response}" | jq -r '.done // false')"
  if [[ "${done_flag}" == "true" ]]; then
    error_code="$(echo "${status_response}" | jq -r '.error.code // empty')"
    if [[ -n "${error_code}" ]]; then
      echo "error: generation failed" >&2
      echo "${status_response}" | jq -C '.' >&2
      exit 1
    fi

    video_uri="$(echo "${status_response}" | jq -r '.response.generateVideoResponse.generatedSamples[0].video.uri // empty')"
    if [[ -z "${video_uri}" ]]; then
      echo "error: generation finished but no video URI found" >&2
      echo "${status_response}" | jq -C '.' >&2
      exit 1
    fi

    echo "downloading video..."
    curl -sSL -o "${output_file}" -H "x-goog-api-key: ${GEMINI_API_KEY}" "${video_uri}"
    echo "done: ${output_file}"
    exit 0
  fi

  sleep "${POLL_INTERVAL_SECONDS}"
done

echo "error: timed out waiting for video operation to complete" >&2
exit 1
