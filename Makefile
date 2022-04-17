COMMIT_HASH=1.0.0
DOCKER_BUILD=docker build .
DOCKER_BUILDX=docker buildx build .
DOCKER_PUSH=docker push
IMAGE_PATH=nekia

build_all: scanner-linea crawler-linea mediator

push_all: scanner-lineap crawler-lineap mediatorp

scanner-linea:
	cd $(patsubst %-linea,%,$@)/$(patsubst scanner-%,%,$@) && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

scanner-linea.arm64:
	$(DOCKER_BUILDX) --platform linux/arm64 -f scanner/linea/Dockerfile -t $(IMAGE_PATH)/$(patsubst %.arm64,%,$@):$(COMMIT_HASH) --push

crawler-linea:
	cd $(patsubst %-linea,%,$@)/$(patsubst crawler-%,%,$@) && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

crawler-lineap: crawler-linea
	$(DOCKER_PUSH) $(IMAGE_PATH)/$<:$(COMMIT_HASH)

mediator:
	$(DOCKER_BUILD) -f $@/Dockerfile -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

mediatorp: mediator
	$(DOCKER_PUSH) $(IMAGE_PATH)/$<:$(COMMIT_HASH)

notifier:
	cd notification && \
	$(DOCKER_BUILD) -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

notifierp: notifier
	$(DOCKER_PUSH) $(IMAGE_PATH)/$<:$(COMMIT_HASH)

.PHONY: scanner-linea scanner-lineap crawler-linea crawler-lineap mediator mediatorp notifier notifierp

