# See http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html for
# syntax details.

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: lint
lint: ## Run TS typecheck and ESLint
	npx tsc --jsx react-jsxdev --noEmit
	./node_modules/.bin/eslint src

.PHONY: fix-lint
fix-lint: ## Fix lint using ESLint
	npx eslint --fix $(find src -type d)

.PHONY: test
test: ## Run tests
	npx jest

.PHONY: dev-test
dev-test: ## Run tests continuously
	npx jest --watch

.PHONY: style
style:
	mkdir -p ./build/css
	npx sass \
		--load-path=node_modules/bootstrap/scss \
		css/ppi.sass > build/css/ppi.css

.PHONY: bundle
bundle: lint
	npx esbuild \
		src/main.tsx \
		--bundle \
		--outfile=build/js/ppi.js \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"production\" \
		--minify

build/js/bench.js: src/bench.js src/reprojection.ts
	npx esbuild \
		src/bench.js \
		--bundle \
		--platform=node \
		--outfile=build/js/bench.js \
		--define:process.env.NODE_ENV=\"production\" \
		--minify

.PHONY: bench
bench: build/js/bench.js
	node $<
	rm $<

.PHONY: build
build: bundle style ## Build distribution into directory 'build'
	mkdir -p ./build/js
	mkdir -p ./build/css

	cp node_modules/ol/ol.css build/css/
	cp node_modules/bootstrap/dist/css/bootstrap.min.css build/css/
	cp -R www/* build/

.PHONY: dev-bundle
dev-bundle:
	npx esbuild \
		src/main.tsx \
		--bundle \
		--outfile=build/js/ppi.js \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"test\" \
		--sourcemap

.PHONY: dev-build
dev-build: ## Watch for filesystem changes and build on change
	make dev-bundle style
	find Makefile src www -type f | entr make dev-bundle style

.PHONY: dev-typecheck
dev-typecheck: # Watch for filesystem changes and typecheck
	npx tsc --jsx react-jsxdev -w --noEmit

.PHONY: clean
clean: ## Clean build directory
	rm -rf ./build/js/* ./build/css/* ./build/*.html
