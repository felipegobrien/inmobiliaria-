// Configuración de Metro para monorepo (npm workspaces).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Observar también la raíz del monorepo (para @inmo/shared).
config.watchFolders = [workspaceRoot];

// 2. Resolver módulos desde node_modules del proyecto y de la raíz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
