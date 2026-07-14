require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
const express = require('express');
const router = require('./src/routes').default;
const app = express();
app.use('/api', router);
const stack = app._router.stack || [];
console.log('top stack length', stack.length);
stack.forEach((layer, index) => {
  const route = layer.route;
  if (route) {
    console.log(index, 'route', route.path, Object.keys(route.methods));
  } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
    console.log(index, 'router layer', layer.regexp && layer.regexp.source);
    layer.handle.stack.forEach((subLayer, subIndex) => {
      if (subLayer.route) {
        console.log('  ', index + '.' + subIndex, 'subroute', subLayer.route.path, Object.keys(subLayer.route.methods));
      }
    });
  } else {
    console.log(index, layer.name || 'unknown', layer.regexp && layer.regexp.source);
  }
});
