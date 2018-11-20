#!/usr/bin/env node

/* eslint-disable */
// removeIf(production)
require('@babel/register');
require('@babel/polyfill');
// endRemoveIf(production)
/* eslint-enable */

require('./src/bin/app');
