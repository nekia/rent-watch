#!/bin/bash

mkdir backup 2>/dev/null
ps auxw | grep kube-apiservers | grep -v grep > /dev/null
if [ $? -eq 0 ]; then
	docker run --rm -it -v $PWD/backup:/home/redis-backup redis redis-cli -u "redis://192.168.2.132:32565" --rdb /home/redis-backup/backup.rdb
else
	kubectl exec -i -n rent rent-redis-594bf88844-bfqkk -- redis-cli --rdb /tmp/backup-`date +%Y%m%d`.rdb
	kubectl cp  rent/rent-redis-594bf88844-bfqkk:/tmp ./backup
fi
