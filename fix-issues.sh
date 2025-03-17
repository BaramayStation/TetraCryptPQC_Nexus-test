#!/bin/bash

# Update all dependencies
npm update --depth 9999

# Remove deprecated packages
npm remove rimraf inflight yaeti abab domexception @libp2p/mplex glob

# Install secure replacements
npm install lru-cache @chainsafe/libp2p-yamux autoprefixer postcss --save-dev

# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Fix vulnerabilities
npm audit fix --force

# Install Lighthouse globally
npm install -g lighthouse

# Verify build and test
npm test
rm -rf dist
npm run build
npm start