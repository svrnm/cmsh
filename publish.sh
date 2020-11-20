#!/bin/bash
source ./.env
rsync --exclude "app/" --exclude "$(basename ${0})" --exclude .env --exclude .gitignore --exclude .git -re ssh -v ./ "${CMSH_TARGET}"
