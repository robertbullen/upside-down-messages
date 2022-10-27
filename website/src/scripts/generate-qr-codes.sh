#!/usr/bin/env zsh

# Declare where the website will be hosted.
BASE_URL='https://upside-down-messages.robertbullen.net/'

# Install dependencies.
brew install --quiet imagemagick qrencode

# Create a single, large QR code for the base URL.
qrencode \
    --level=H \
    --output='public/img/base-qr-code.png' \
    --size=16 \
    "${BASE_URL}"

# Create a temporary working directory in which to place intermediate files.
TEMP_DIR=$(mktemp -d)

# Iterate over all clue files.
for CLUE_FILE in public/clues/*.json; do
    CLUE_NAME=$(basename ${CLUE_FILE} .json)

    # Generate a QR code with the highest level of error correction for the current clue's URL
    # saved as a PNG image with 8x8-pixel cells for increased resolution.
    qrencode \
        --level=H \
        --output="${TEMP_DIR}/${CLUE_NAME}.png" \
        --size=8 \
        "${BASE_URL}hunt.html?clueName=${CLUE_NAME}"
done

# Tile all the generated QR codes, each with a frame labeled with the clue name, into a single
# image that can easily be printed.
magick montage \
    -fill white -pointsize 48 -label '%t' \
    -mattecolor black -frame 4 \
    -geometry '+8+8' \
    "${TEMP_DIR}/*.png" \
    "public/img/clue-qr-codes.png"

# Clean up the working directory.
rm -rf "${TEMP_DIR}"
