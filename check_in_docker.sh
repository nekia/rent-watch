#!/bin/bash

ret=0
while [ $ret -eq 0 ]; do
	kill -9 $(ps auxw | grep "docker run" | sed -n -e 1p | awk '{print $2}') 2>/dev/null
	ret=$?
	echo "Killing zombie containers $ret"
done

killall -9 chrome
echo "Killing zombie process (chrome)"

killall -9 node
echo "Killing zombie process (node)"

docker run --rm \
	--ipc=host \
	--user pwuser \
	--security-opt seccomp=seccomp_profile.json \
	-v $PWD/index-linea.js:/usr/src/app/index-linea.js \
	-v $PWD/index-homes.js:/usr/src/app/index-homes.js \
	-v $PWD/index-main.js:/usr/src/app/index-main.js \
	-v $PWD/index-mitsui.js:/usr/src/app/index-mitsui.js \
	-v $PWD/index-rnet.js:/usr/src/app/index-rnet.js \
	-v $PWD/index-rstore.js:/usr/src/app/index-rstore.js \
	-v $PWD/index-suumo.js:/usr/src/app/index-suumo.js \
	-v $PWD/index-tpo.js:/usr/src/app/index-tpo.js \
	-v $PWD/index-bs.js:/usr/src/app/index-bs.js \
	-v $PWD/index-td.js:/usr/src/app/index-td.js \
	-v $PWD/setting.js:/usr/src/app/setting.js \
	-v $PWD/utils.js:/usr/src/app/utils.js \
	--env LINE_NOTIFY_TOKEN=$LINE_NOTIFY_TOKEN \
	nekia/rent-env:1.0.1 \
	node $1
