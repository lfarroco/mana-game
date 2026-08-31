#!/usr/bin/env bash
#
# scripts/bump-android-version.sh — bump the Android release version in
# android/app/build.gradle before a build.
#
#   - versionCode is always incremented by 1. Play Console requires a fresh,
#     never-reused version code per upload — auto-incrementing here is what
#     prevents the "version code X already used" upload error.
#   - versionName comes from, in order of precedence:
#       1. $VERSION            (e.g. `VERSION=1.3 make android-build`)
#       2. an interactive prompt (Enter accepts the suggested patch bump)
#       3. an automatic patch bump when stdin is not a TTY (CI / piped)
#
# Prints the old → new values. Pass a build.gradle path as $1 to test on a
# copy. The rewrite preserves indentation and quote style.
set -euo pipefail

GRADLE_FILE="${1:-android/app/build.gradle}"

if [ ! -f "$GRADLE_FILE" ]; then
    echo "error: $GRADLE_FILE not found" >&2
    exit 1
fi

cur_code="$(sed -nE 's/^[[:space:]]*versionCode[[:space:]]+([0-9]+)[[:space:]]*$/\1/p' "$GRADLE_FILE")"
cur_name="$(sed -nE 's/^[[:space:]]*versionName[[:space:]]+"([^"]*)"[[:space:]]*$/\1/p' "$GRADLE_FILE")"

if [ -z "$cur_code" ] || [ -z "$cur_name" ]; then
    echo "error: could not parse versionCode/versionName from $GRADLE_FILE" >&2
    exit 1
fi

# Suggested next versionName: bump the last dot-separated numeric component
# (1.1 → 1.2, 2.4.9 → 2.4.10). Names that don't end in a number keep as-is.
suggested="$cur_name"
if [[ "$cur_name" =~ ^(.*\.)?([0-9]+)$ ]]; then
    base="${BASH_REMATCH[1]}"
    last="${BASH_REMATCH[2]}"
    suggested="${base}$((last + 1))"
fi

if [ -n "${VERSION:-}" ]; then
    new_name="$VERSION"
elif [ -t 0 ]; then
    printf 'Current Android version: versionName "%s" (versionCode %s)\n' "$cur_name" "$cur_code"
    read -r -p "New version name [${suggested}]: " new_name || true
    new_name="${new_name:-$suggested}"
else
    # Non-interactive: auto-bump without prompting.
    new_name="$suggested"
fi

# Guard against a blank/whitespace answer.
new_name="$(printf '%s' "$new_name" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
[ -n "$new_name" ] || new_name="$suggested"

new_code=$((cur_code + 1))

sed -i.bak -E \
    -e "s/^([[:space:]]*)versionCode[[:space:]]+[0-9]+/\1versionCode ${new_code}/" \
    -e "s/^([[:space:]]*)versionName[[:space:]]+\"[^\"]*\"/\1versionName \"${new_name}\"/" \
    "$GRADLE_FILE"
rm -f "$GRADLE_FILE.bak"

echo "Android version bumped: versionName \"${cur_name}\" -> \"${new_name}\", versionCode ${cur_code} -> ${new_code}"
