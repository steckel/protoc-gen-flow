import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import istanbul from 'rollup-plugin-istanbul';
import {readFileSync} from 'fs';

const pkg = require('./package.json');
const external = Object.keys(pkg.dependencies);

const babelConfig = JSON.parse(readFileSync('./.babelrc.rollup'));
babelConfig["babelrc"] = false;

export default {
  banner: '#!/usr/bin/env node',
  entry: 'src/index.js',
  plugins: [
    babel(babelConfig),
    istanbul({
      exclude: ['test/**/*', 'node_modules/**/*']
    })
  ],
  external: external,
  targets: [
    {
      dest: pkg['bin'],
      format: 'umd'
    }
  ]
};
