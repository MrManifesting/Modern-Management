const express = require('express');
const app = express();

// Mock storage
const storage = {};

// Import registerRoutes
const { registerRoutes } = require('./server/routes.js');

// Register routes
registerRoutes(app, storage);

// List all registered routes
function listRoutes(app) {
  const routes = [];
  app._router.stack.forEach(function(r) {
    if (r.route && r.route.path) {
      const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
      routes.push(`${methods} ${r.route.path}`);
    }
  });
  return routes;
}

const registeredRoutes = listRoutes(app);
console.log('Total routes registered:', registeredRoutes.length);
console.log('\nShopify Media routes:');
registeredRoutes
  .filter(route => route.includes('/api/shopify/media'))
  .forEach(route => console.log(route));

console.log('\nOther Shopify routes:');
registeredRoutes
  .filter(route => route.includes('/api/shopify/') && !route.includes('/media'))
  .slice(0, 10)
  .forEach(route => console.log(route));