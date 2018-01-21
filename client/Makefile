# See http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html for
# syntax details.

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: deps-install
deps-install: ## Install development dependencies
	npm install

.PHONY: deps-clean
deps-clean: ## Remove development dependencies (node_modules)
	rm -rf ./node_modules


# TODO: refactor to share code
.PHONY: build
build: ## Build distribution into directory 'build'
	mkdir -p ./build/{js,css}
	node_modules/.bin/browserify src/main.js \
		-o build/js/observer.js \
		-t [ babelify --presets [ es2015 react ] ]
	node_modules/.bin/node-sass \
		--include-path=node_modules/bootstrap/scss \
		css/observer.sass > build/css/observer.css
	cp node_modules/openlayers/css/ol.css build/css/
	cp node_modules/bootstrap/dist/css/bootstrap.min.css build/css/
	cp -R www/* build/


.PHONY: buildincr
buildincr: ## Build distribution incrementally into directory 'build'
	mkdir -p ./build/{js,css}
	node_modules/.bin/browserifyinc src/main.js --cachefile inc_build.cache \
		-o build/js/observer.js \
		-t [ babelify --presets [ es2015 react ] ]
	# node_modules/.bin/lessc \
	# 	--include-path=node_modules/bootstrap/less \
	# 	css/observer.less \
	# 	build/css/observer.css
	# cp node_modules/openlayers/css/ol.css build/css/
	# cp node_modules/bootstrap/dist/css/bootstrap.min.css build/css/
	# cp -R www/* build/


.PHONY: dev-build
dev-build: ## Watch for filesystem changes and build on change
	make buildincr
	date
	find Makefile src www css -type f | entr make build

.PHONY: clean
clean: ## Clean build directory
	rm -rf ./build
