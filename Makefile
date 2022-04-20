COMMIT_HASH=1.0.0
DOCKER_BUILD=docker build .
DOCKER_BUILDX=docker buildx build --builder myapp .
DOCKER_PUSH=docker push
DOCKER_TAG=docker tag
IMAGE_PATH=nekia
REGISTRY_URL=192.168.2.133:32608

# docker buildx create --use --name myapp --driver docker-container --config ./buildkitd.toml

build_all: scanner-linea crawler-linea mediator

push_all: scanner-linea.arm64 crawler-linea.arm64 mediator.arm64 notifier.arm64

scanner-linea:
	cd scanner/linea && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

scanner-linea.arm64:
	cd scanner/linea && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-linea:
	cd crawler/linea && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

crawler-linea.arm64:
	cd crawler/linea && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

mediator:
	cd mediator && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

mediator.arm64:
	cd mediator && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

notifier:
	cd notification && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

notifier.arm64:
	cd notification && \
	$(DOCKER_BUILDX) --platform linux/arm64 -t ${REGISTRY_URL}/$(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

.PHONY: scanner-linea scanner-linea.arm64 crawler-linea crawler-linea.arm64 mediator mediator.arm64 notifier notifier.arm64

