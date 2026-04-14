COMPOSE ?= docker compose

.PHONY: up down build logs seed restart clean

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f --tail=200

seed:
	$(COMPOSE) exec backend npm run seed

restart:
	$(COMPOSE) restart

clean:
	$(COMPOSE) down -v --remove-orphans
	docker image prune -f
