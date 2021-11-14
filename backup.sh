#!/bin/bash

mkdir backup 2>/dev/null
docker run --rm -it -v $PWD/backup:/home/redis-backup redis redis-cli -u "redis://192.168.2.132:32565" --rdb /home/redis-backup/backup.rdb
