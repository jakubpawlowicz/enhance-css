TEST_DIR = test
VOWS = ./node_modules/vows/bin/vows

all: test

test:
	@@echo "Running all tests via vows"
	@@${VOWS} ${TEST_DIR}/*-test.js

.PHONY: all test