##############################################################################
## Mandatory machinery
##############################################################################
# See http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html for
# syntax details.
.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: clean
clean: ## Clean build directory
	rm -rf ./build/{js,css} ./build/*.html tsconfig.tsbuildinfo .eslintcache ./node_modules/.cache/knip

.PHONY: dirs
dirs:
	mkdir -p build/js
	mkdir -p build/css


##############################################################################
## Styles
##############################################################################
build/css/ol.css: dirs
	cp node_modules/ol/ol.css $@

build/css/bootstrap.min.css: dirs
	cp node_modules/bootstrap/dist/css/bootstrap.min.css $@

build/css/ppi.css: dirs $(wildcard css/*)
	npx sass --load-path=node_modules/bootstrap/scss css/ppi.sass > $@

.PHONY: styles
styles: build/css/ppi.css build/css/bootstrap.min.css build/css/ol.css


##############################################################################
## HTML
##############################################################################
source_html_files := $(wildcard www/*.html)
html_files := $(patsubst www/%, build/%, $(source_html_files))

$(html_files): build/%: www/% dirs
	cp $< $@

.PHONY: html
html: $(html_files)


##############################################################################
## Production build
##############################################################################
build/js:
	mkdir -p build/js

.PHONY: bundle-prod
bundle-prod: dirs
	npx esbuild \
		src/main.tsx \
		--bundle \
		--outfile=build/js/ppi.js \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"production\" \
		--minify

.PHONY: build-prod
build-prod: lint test bundle-prod $(html_files) styles ## Build a production distribution into directory 'build'


##############################################################################
## Development build
##############################################################################
.PHONY: bundle-dev
bundle-dev: dirs
	npx esbuild \
		src/main.tsx \
		--bundle \
		--outfile=build/js/ppi.js \
		--loader:.js=jsx \
		--define:process.env.NODE_ENV=\"test\" \
		--sourcemap

# This is called by build-dev.bash, don't use directly
.PHONY: bundle-and-serve-dev
bundle-and-serve-dev: dirs
	npx esbuild \
	    src/main.tsx \
	    --bundle \
	    --outfile=build/js/ppi.js \
	    --loader:.js=jsx \
	    --define:process.env.NODE_ENV=\"test\" \
	    --sourcemap \
	    --serve=8000 \
	    --watch=forever \
	    --servedir=build

.PHONY: watch
watch: $(html_files) styles ## Build and watch everything continuously
	bash watch.bash


##############################################################################
## Testing & linting
##############################################################################
.PHONY: lint
lint: ## Run TS typecheck and ESLint
	npx tsc --jsx react-jsxdev --noEmit --incremental
	npx eslint --cache src test
	npx knip -n --cache

.PHONY: lint-watch
lint-watch: ## Run typechecker and ESLint continuously
	find src -type f | entr make lint

.PHONY: lint-fix
lint-fix: ## Fix lint using ESLint
	npx eslint --fix $(find src -type d)

.PHONY: typecheck-watch
typecheck-watch: # Watch for filesystem changes and typecheck
	npx tsc --jsx react-jsxdev -w --noEmit

.PHONY: test
test: ## Run tests
	npx jest

.PHONY: test-watch
test-watch: ## Run tests continuously
	npx jest --watch


##############################################################################
## bench.js specifics
##############################################################################
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

