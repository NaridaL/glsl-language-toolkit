#!/usr/bin/env bash

# npm version doesn't work with workspaces,
# so this script does basically the same thing.

NEW_VERSION=$1

if [ ! -z "$(git status --porcelain)" ] ; then
  echo "Uncomitted changes, aborting."
  exit 1
fi

npm version "$NEW_VERSION"

NEW_TAG="prettier-plugin-glsl-v$(jq --raw-output .version package.json)"

git commit -am "$NEW_TAG"
git tag "$NEW_TAG"
git push --atomic origin HEAD "$NEW_TAG"
