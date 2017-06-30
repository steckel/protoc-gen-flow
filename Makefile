BIN = ./node_modules/.bin
ROLLUP = $(BIN)/rollup

.PHONY: bin
bin:
	$(ROLLUP) -c
	chmod +x bin/protoc-gen-flow

.PHONY: test
test: bin
test:
	npm test
