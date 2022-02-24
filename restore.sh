#!/bin/bash

ret=`which rdb`
if [[ $? -eq 1 ]]; then
	echo 'You need to install rdbtools. (pip install rdbtools)'
	exit 1
fi
rdb -c protocol backup/backup.rdb > ./backup/backup.protocol
# tar cf - ./backup |kubectl exec -i -n rent rent-redis-fd68cdd87-2m9n5 -- sh -c 'tar xf - -C /data'
docker run -it --rm -v $PWD/backup:/data/backup redis sh -c 'redis-cli -h 192.168.2.132 -p 31951 --pipe < /data/backup/backup.protocol'