COMMIT_HASH=1.0.0
DOCKER_BUILD=docker build .
DOCKER_PUSH=docker push
IMAGE_PATH=nekia

scanner-linea:
	$(DOCKER_BUILD) -f $(patsubst %-linea,%,$@)/$(patsubst scanner-%,%,$@)/Dockerfile -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

scanner-lineap: scanner-linea
	$(DOCKER_PUSH) $(IMAGE_PATH)/$<-linea:$(COMMIT_HASH)

crawler-linea:
	$(DOCKER_BUILD) -f $(patsubst %-linea,%,$@)/$(patsubst crawler-%,%,$@)/Dockerfile -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

crawler-lineap: crawler-linea
	$(DOCKER_PUSH) $(IMAGE_PATH)/$<-linea:$(COMMIT_HASH)

mediator:
	$(DOCKER_BUILD) -f $@/Dockerfile -t $(IMAGE_PATH)/$@:$(COMMIT_HASH)

mediatorp: mediator
	$(DOCKER_PUSH) $(IMAGE_PATH)/$<:$(COMMIT_HASH)

.PHONY: scanner-linea scanner-lineap crawler-linea crawler-lineap mediator mediatorp

