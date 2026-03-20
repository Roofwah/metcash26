const path = require('path');
const Module = require('module');

// Render installs dependencies in /server with the current dashboard config.
// Add that node_modules path so backend/ can resolve its runtime packages.
process.env.NODE_PATH = path.resolve(__dirname, 'node_modules');
Module._initPaths();

require('../backend/server');
