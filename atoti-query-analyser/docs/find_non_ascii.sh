#!/bin/bash

RED='\033[1;31m'
GREEN='\033[1;32m'
NC='\033[0m'

count=0
errCount=0

for filename in `find . -name '*.md' | grep -v '__index__' | sort`; do
    count=$(( count + 1 ))
    if LC_ALL=C grep -P -q "[^\x00-\x7F]" $filename; then
        errCount=$(( errCount + 1 ))
        echo -e "${RED}NOK${NC}\t$filename"
    else
        echo -e "${GREEN}OK${NC}\t$filename"
    fi
done

echo "Errors: $errCount/$count"

