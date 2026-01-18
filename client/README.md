# Client (browser) side code for PPI

## Development

First navigate to the directory this README file is at. Then start the
watcher/compiler/server with the following command.

    make watch

And then navigate to http://localhost:8000/ with your browser.


## Production build

    make build-prod


## TODOs

### Cursor tool and rendered data discrepancy

There's a Y offset difference by one grid unit. No idea where it comes from.
