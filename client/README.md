# Client (browser) side code for PPI

## Development

First navigate to the directory this README file is at. Then start the
watcher/compiler/server with the following command.

    make watch

And then navigate to http://localhost:8000/ with your browser.


## Production build

    make build-prod


## TODOs

### React StrictMode doesn't work when run through esbuild server

Stack trace looks like:
```
installHook.js:1 No map visible because the map container's width or height are 0.
overrideMethod	@	￼installHook.js:1
PluggableMap2.updateSize	@	￼PluggableMap.js:1701
PluggableMap2.handleTargetChanged_	@	￼PluggableMap.js:1327
Target2.dispatchEvent	@	￼Target.js:114
BaseObject2.notify	@	￼Object.js:176
BaseObject2.set	@	￼Object.js:215
BaseObject2.setProperties	@	￼Object.js:229
PluggableMap2	@	￼PluggableMap.js:430
Map4	@	￼Map.js:72
componentDidMount	@	￼map.tsx:314
invokeLayoutEffectMountInDEV	@	￼react-dom.development.js:25172
invokeEffectsInDev	@	￼react-dom.development.js:27390
commitDoubleInvokeEffectsInDEV	@	￼react-dom.development.js:27366
flushPassiveEffectsImpl	@	￼react-dom.development.js:27095
flushPassiveEffects	@	￼react-dom.development.js:27023
commitRootImpl	@	￼react-dom.development.js:26974
commitRoot	@	￼react-dom.development.js:26721
performSyncWorkOnRoot	@	￼react-dom.development.js:26156
flushSyncCallbacks	@	￼react-dom.development.js:12042
(anonymous)	@	￼react-dom.development.js:25690
```

