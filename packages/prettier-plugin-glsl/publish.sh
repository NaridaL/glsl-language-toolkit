#!/usr/bin/env bash

NEW_VERSION=$1

if [ ! -z "$(git status --procelain)" ] ; then
  echo "Uncomitted changes, aborting."
  exit 1
fi

npm version "$NEW_VERSION"

NEW_TAG="prettier-plugin-glsl-$(jq .version package.json)"

git commit -am "$NEW_TAG"
git push --atomic origin HEAD "$NEW_TAG"
