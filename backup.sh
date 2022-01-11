#!/bin/bash

BASEDIR=$(dirname "$0")
mkdir ${BASEDIR}/backup 2>/dev/null
ps auxw | grep kube-apiservers | grep -v grep > /dev/null
if [ $? -eq 0 ]; then
	docker run --rm -it -v ${BASEDIR}/backup:/home/redis-backup redis redis-cli -u "redis://192.168.2.132:32089" --rdb /home/redis-backup/backup-`date +%Y%m%d`.rdb
else
	kubectl exec -i -n rent rent-redis-594bf88844-xsfnf -- redis-cli --rdb /tmp/backup-`date +%Y%m%d`.rdb
	kubectl cp  rent/rent-redis-594bf88844-xsfnf:/tmp ${BASEDIR}/backup
fi
