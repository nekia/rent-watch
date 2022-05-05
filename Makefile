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

protogen: protogen.crawler-linea protogen.crawler-suumo \
					protogen.crawler-homes protogen.crawler-rstore \
					protogen.crawler-goodrooms \
					protogen.notifier protogen.cache-mgr
build_all:  scanner-linea crawler-linea \
						scanner-suumo crawler-suumo \
						scanner-homes crawler-homes \
						scanner-rstore crawler-rstore \
						scanner-goodrooms crawler-goodrooms \
						mediator notifier cache-mgr
push_all: scanner-linea.arm64 crawler-linea.arm64 \
					scanner-suumo.arm64 crawler-suumo.arm64 \
					scanner-homes.arm64 crawler-homes.arm64 \
					scanner-rstore.arm64 crawler-rstore.arm64 \
					scanner-goodrooms.arm64 crawler-goodrooms.arm64 \
					mediator.arm64 notifier.arm64 cache-mgr.arm64

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

protogen.crawler-homes:
	rm -rf crawler/homes/generated
	mkdir -p crawler/homes/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:crawler/homes/generated \
		--grpc_out=grpc_js:crawler/homes/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto

protogen.crawler-rstore:
	rm -rf crawler/rstore/generated
	mkdir -p crawler/rstore/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:crawler/rstore/generated \
		--grpc_out=grpc_js:crawler/rstore/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto

protogen.crawler-goodrooms:
	rm -rf crawler/goodrooms/generated
	mkdir -p crawler/goodrooms/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:crawler/goodrooms/generated \
		--grpc_out=grpc_js:crawler/goodrooms/generated \
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

pwbase:
	$(DOCKER_BUILDX) -f Dockerfile-pwbase --platform linux/amd64 -t ${REGISTRY_URL}/$@:$(COMMIT_HASH) --push

pwbase.arm64:
	$(DOCKER_BUILDX) -f Dockerfile-pwbase --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-linea:
	cd scanner/linea && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

scanner-linea.arm64:
	cd scanner/linea && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-suumo:
	cd scanner/suumo && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

scanner-suumo.arm64:
	cd scanner/suumo && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-homes:
	cd scanner/homes && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

scanner-homes.arm64:
	cd scanner/homes && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-rstore:
	cd scanner/rstore && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

scanner-rstore.arm64:
	cd scanner/rstore && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-goodrooms:
	cd scanner/goodrooms && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

scanner-goodrooms.arm64:
	cd scanner/goodrooms && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-linea: protogen.crawler-linea
	cd crawler/linea && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

crawler-linea.arm64: protogen.crawler-linea
	cd crawler/linea && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-suumo: protogen.crawler-suumo
	cd crawler/suumo && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

crawler-suumo.arm64: protogen.crawler-suumo
	cd crawler/suumo && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-goodrooms: protogen.crawler-goodrooms
	cd crawler/goodrooms && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

crawler-goodrooms.arm64: protogen.crawler-goodrooms
	cd crawler/goodrooms && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-homes: protogen.crawler-homes
	cd crawler/homes && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

crawler-homes.arm64: protogen.crawler-homes
	cd crawler/homes && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-rstore: protogen.crawler-rstore
	cd crawler/rstore && \
	$(DOCKER_BUILD) -t $@:$(COMMIT_HASH)

crawler-rstore.arm64: protogen.crawler-rstore
	cd crawler/rstore && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

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

.PHONY: scanner-linea scanner-linea.arm64 crawler-linea crawler-linea.arm64 \
				scanner-suumo scanner-suumo.arm64 crawler-suumo crawler-suumo.arm64 \
				scanner-homes scanner-homes.arm64 crawler-homes crawler-homes.arm64 \
				scanner-rstore scanner-rstore.arm64 crawler-rstore crawler-rstore.arm64 \
				scanner-goodrooms scanner-goodrooms.arm64 crawler-goodrooms crawler-goodrooms.arm64 \
				mediator mediator.arm64 notifier notifier.arm64 cache-mgr cache-mgr.arm64 \
				protogen pwbase pwbase.arm64

