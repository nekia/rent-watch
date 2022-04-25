COMMIT_HASH=1.0.0
DOCKER_BUILD=docker build .
DOCKER_BUILDX=docker buildx build --builder myapp .
DOCKER_PUSH=docker push
DOCKER_TAG=docker tag
IMAGE_PATH=nekia
REGISTRY_URL=192.168.2.133:32608

# docker buildx create --use --name myapp --driver docker-container --config ./buildkitd.toml

# Makefile
NPM_BIN=$(shell npm bin)
GRPC_TOOL=$(NPM_BIN)/grpc_tools_node_protoc

protogen: protogen.crawler-linea protogen.crawler-suumo protogen.notifier protogen.cache-mgr

protogen.crawler-linea:
	rm -rf crawler/linea/generated
	mkdir -p crawler/linea/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:crawler/linea/generated \
		--grpc_out=grpc_js:crawler/linea/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto

protogen.crawler-suumo:
	rm -rf crawler/suumo/generated
	mkdir -p crawler/suumo/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:crawler/suumo/generated \
		--grpc_out=grpc_js:crawler/suumo/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto

protogen.notifier:
	rm -rf notification/generated
	mkdir -p notification/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:notification/generated \
		--grpc_out=grpc_js:notification/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto

protogen.cache-mgr:
	rm -rf cacheMgr/generated
	mkdir -p cacheMgr/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:cacheMgr/generated \
		--grpc_out=grpc_js:cacheMgr/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto

build_all: scanner-linea crawler-linea mediator notifier cache-mgr
push_all: scanner-linea.arm64 crawler-linea.arm64 mediator.arm64 notifier.arm64 cache-mgr.arm64

scanner-linea:
	cd scanner/linea && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

scanner-linea.arm64:
	cd scanner/linea && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-suumo:
	cd scanner/suumo && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

scanner-suumo.arm64:
	cd scanner/suumo && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-linea: protogen.crawler-linea
	cd crawler/linea && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

crawler-linea.arm64: protogen.crawler-linea
	cd crawler/linea && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-suumo: protogen.crawler-suumo
	cd crawler/suumo && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

crawler-suumo.arm64: protogen.crawler-suumo
	cd crawler/suumo && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

mediator:
	cd mediator && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

mediator.arm64:
	cd mediator && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

notifier: protogen.notifier
	cd notification && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

notifier.arm64: protogen.notifier
	cd notification && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

cache-mgr: protogen.cache-mgr
	cd cacheMgr && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

cache-mgr.arm64: protogen.cache-mgr
	cd cacheMgr && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

.PHONY: scanner-linea scanner-linea.arm64 crawler-linea crawler-linea.arm64 scanner-suumo scanner-suumo.arm64 crawler-suumo crawler-suumo.arm64 mediator mediator.arm64 notifier notifier.arm64 cache-mgr cache-mgr.arm64 protogen

