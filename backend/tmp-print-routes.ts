import express from 'express';
import router from './src/routes';

const app = express();
app.use('/api', router);

const output: Array<{ path: string | RegExp; methods: string[]; name: string }> = [];

const stack = (app as any)._router.stack || [];
for (const layer of stack) {
  if (layer.route) {
    const route = layer.route;
    const methods = Object.keys(route.methods).map((m) => m.toUpperCase());
    output.push({ path: route.path, methods, name: route.stack?.[0]?.name || 'anonymous' });
  } else if (layer.name === 'router') {
    const handleStack = layer.handle.stack || [];
    for (const subLayer of handleStack) {
      if (subLayer.route) {
        const route = subLayer.route;
        const methods = Object.keys(route.methods).map((m) => m.toUpperCase());
        output.push({ path: route.path, methods, name: route.stack?.[0]?.name || 'anonymous' });
      }
    }
  }
}
console.log(JSON.stringify(output, null, 2));
