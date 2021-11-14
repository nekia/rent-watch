#!/bin/bash

ret=`which rdb`
if [[ $? -eq 1 ]]; then
	echo 'You need to install rdbtools. (pip install rdbtools)'
	exit 1
fi
rdb -c protocol backup/backup.rdb > ./backup/backup.protocol
tar cf - ./backup |kubectl exec -i -n rent rent-redis-594bf88844-bfqkk -- tar xf - -C /data
kubectl exec -it -n rent rent-redis-594bf88844-bfqkk -- 'redis-cli --pipe < /data/backup/backup.protocol'
