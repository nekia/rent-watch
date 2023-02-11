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
					protogen.crawler-goodrooms protogen.crawler-mitsui \
					protogen.crawler-rnet protogen.crawler-ken \
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
					scanner-rnet.arm64 crawler-rnet.arm64 \
					scanner-ken.arm64 crawler-ken.arm64 \
					scanner-bs.arm64 crawler-bs.arm64 \
					scanner-td.arm64 crawler-td.arm64 \
					mediator.arm64 notifier.arm64 cache-mgr.arm64 \
					area-info-mgr.arm64	imi-server.arm64

protogen.commit:
	rm -rf pbjs_generated
	mkdir -p pbjs_generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:pbjs_generated \
		--grpc_out=grpc_js:pbjs_generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto ./protobuf/roomdetail.proto \
		./protobuf/areaInfoMgr.proto

protogen.crawler-%:
	rm -rf crawler/$*/generated
	mkdir -p crawler/$*/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:crawler/$*/generated \
		--grpc_out=grpc_js:crawler/$*/generated \
		--proto_path=protobuf \
		./protobuf/cacheMgr.proto ./protobuf/roomdetail.proto

protogen.notifier:
	rm -rf notifier/generated
	mkdir -p notifier/generated
	$(GRPC_TOOL) --js_out=import_style=commonjs,binary:notifier/generated \
		--grpc_out=grpc_js:notifier/generated \
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
	$(DOCKER_BUILDX) -f scanner/$(patsubst scanner-%.arm64,%,$@)/Dockerfile --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

scanner-%:
	cd scanner/$* && \
	$(DOCKER_BUILDX) -f scanner/$(patsubst scanner-%,%,$@)/Dockerfile --platform linux/amd64 -t ${REGISTRY_URL}/$@:$(COMMIT_HASH) --push

crawler-%.arm64: protogen.crawler-%
	$(DOCKER_BUILDX) -f crawler/$(patsubst crawler-%.arm64,%,$@)/Dockerfile --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-%: protogen.crawler-%
	$(DOCKER_BUILDX) -f crawler/$(patsubst crawler-%.arm64,%,$@)/Dockerfile --platform linux/amd64 -t ${REGISTRY_URL}/$@:$(COMMIT_HASH) --push

main:
	$(DOCKER_BUILD) -f main/Dockerfile -t $@:$(COMMIT_HASH)

main.arm64:
	$(DOCKER_BUILDX) -f main/Dockerfile --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

notifier: protogen.notifier
	$(DOCKER_BUILD) -f notifier/Dockerfile -t $@:$(COMMIT_HASH)

notifier.arm64: protogen.notifier
	$(DOCKER_BUILDX) -f notifier/Dockerfile --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

cachemgr: protogen.cache-mgr
	$(DOCKER_BUILD) -f cacheMgr/Dockerfile -t $@:$(COMMIT_HASH)

cachemgr.arm64: protogen.cache-mgr
	$(DOCKER_BUILDX) -f cacheMgr/Dockerfile --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

areainfomgr: protogen.area-info-mgr
	$(DOCKER_BUILD) -f areaInfoMgr/Dockerfile -t $@:$(COMMIT_HASH)

areainfomgr.arm64: protogen.area-info-mgr
	$(DOCKER_BUILDX) -f areaInfoMgr/Dockerfile --platform linux/arm64 -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

imi-server: 
	cd areaInfoMgr && \
	$(DOCKER_BUILD) -f Dockerfile-imi -t $@:$(COMMIT_HASH)

imi-server.arm64:
	cd areaInfoMgr && \
	$(DOCKER_BUILDX) --platform linux/arm64 -f Dockerfile-imi -t ${REGISTRY_URL}/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

.PHONY: mediator mediator.arm64 notifier notifier.arm64 cache-mgr cache-mgr.arm64 \
				area-info-mgr area-info-mgr.arm64 imi-server imi-server.arm64 \
				protogen pwbase pwbase.arm64

