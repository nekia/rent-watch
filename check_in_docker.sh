#!/bin/bash

ret=0
while [ $ret -eq 0 ]; do
	kill -9 $(ps auxw | grep "docker run" | sed -n -e 1p | awk '{print $2}') 2>/dev/null
	ret=$?
	echo "Killing zombie containers $ret"
done

docker run -it --rm \
	--ipc=host \
	--user pwuser \
	--security-opt seccomp=seccomp_profile.json \
	-v $PWD/$1:/usr/src/app/index-linea.js \
	--env LINE_NOTIFY_TOKEN=$LINE_NOTIFY_TOKEN \
	nekia/rent-env:1.0.0
