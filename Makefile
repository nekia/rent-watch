COMMIT_HASH=1.0.0
DOCKER_BUILD=docker build .
DOCKER_BUILDX=docker buildx build --builder myapp .
DOCKER_PUSH=docker push
DOCKER_TAG=docker tag
IMAGE_PATH=nekia
REGISTRY_URL=192.168.0.133:30007

# docker buildx create --use --name myapp --driver docker-container --config ./buildkitd.toml

# Makefile
NPM_BIN=$(shell npm bin)
GRPC_TOOL=$(NPM_BIN)/grpc_tools_node_protoc

protogen: protogen.crawler-linea protogen.crawler-suumo \
					protogen.crawler-homes protogen.crawler-rstore \
					protogen.crawler-goodrooms \
					protogen.notifier protogen.cache-mgr \
					protogen.area-info-mgr
build_all:  scanner-linea crawler-linea \
						scanner-suumo crawler-suumo \
						scanner-homes crawler-homes \
						scanner-rstore crawler-rstore \
						scanner-goodrooms crawler-goodrooms \
						mediator notifier cache-mgr area-info-mgr imi-server
push_all: scanner-linea.arm64 crawler-linea.arm64 \
					scanner-suumo.arm64 crawler-suumo.arm64 \
					scanner-homes.arm64 crawler-homes.arm64 \
					scanner-rstore.arm64 crawler-rstore.arm64 \
					scanner-goodrooms.arm64 crawler-goodrooms.arm64 \
					scanner-mitsui.arm64 crawler-mitsui.arm64 \
					mediator.arm64 notifier.arm64 cache-mgr.arm64 \
					area-info-mgr.arm64	imi-server.arm64

protogen.crawler-%:
	rm -rf crawler/$*/generated
	mkdir -p crawler/$*/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:crawler/$*/generated \
		--grpc_out=grpc_js:crawler/$*/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto ./protobuf/roomdetail.proto

protogen.notifier:
	rm -rf notification/generated
	mkdir -p notification/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:notification/generated \
		--grpc_out=grpc_js:notification/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto ./protobuf/roomdetail.proto \
		./protobuf/areaInfoMgr.proto

protogen.cache-mgr:
	rm -rf cacheMgr/generated
	mkdir -p cacheMgr/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:cacheMgr/generated \
		--grpc_out=grpc_js:cacheMgr/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto ./protobuf/roomdetail.proto

protogen.area-info-mgr:
	rm -rf areaInfoMgr/generated
	mkdir -p areaInfoMgr/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:areaInfoMgr/generated \
		--grpc_out=grpc_js:areaInfoMgr/generated \
		--proto_path=protobuf \
		./protobuf/areaInfoMgr.proto

pwbase:
	$(DOCKER_BUILDX) -f Dockerfile-pwbase --platform linux/amd64 -t ${REGISTRY_URL}/$@:$(COMMIT_HASH) --push

pwbase.arm64:
	$(DOCKER_BUILDX) -f Dockerfile-pwbase --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

ngrok.arm64:
	$(DOCKER_BUILDX) -f Dockerfile-ngrok --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-%.arm64:
	cd scanner/$* && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-%:
	cd scanner/$* && \
	$(DOCKER_BUILDX) --platform linux/amd64 -t ${REGISTRY_URL}/$@:$(COMMIT_HASH) --push

crawler-%.arm64: protogen.crawler-%
	cd crawler/$* && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-%: protogen.crawler-%
	cd crawler/$* && \
	$(DOCKER_BUILDX) --platform linux/amd64 -t ${REGISTRY_URL}/$@:$(COMMIT_HASH) --push

mediator:
	cd mediator && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

mediator.arm64:
	cd mediator && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

notifier: protogen.notifier
	cd notification && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

notifier.arm64: protogen.notifier
	cd notification && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

cache-mgr: protogen.cache-mgr
	cd cacheMgr && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

cache-mgr.arm64: protogen.cache-mgr
	cd cacheMgr && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

area-info-mgr: protogen.area-info-mgr
	cd areaInfoMgr && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

area-info-mgr.arm64: protogen.area-info-mgr
	cd areaInfoMgr && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

imi-server: 
	cd areaInfoMgr && \
	$(DOCKER_BUILD) -f Dockerfile-imi -t $@:$(COMMIT_HASH)

imi-server.arm64:
	cd areaInfoMgr && \
	$(DOCKER_BUILDX) --platform linux/arm64 -f Dockerfile-imi -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

.PHONY: mediator mediator.arm64 notifier notifier.arm64 cache-mgr cache-mgr.arm64 \
				area-info-mgr area-info-mgr.arm64 imi-server imi-server.arm64 \
				protogen pwbase pwbase.arm64

