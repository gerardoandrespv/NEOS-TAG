#!/usr/bin/env node
/**
 * fake-hermesc.js
 * Copia el bundle JS sin compilar a Hermes bytecode.
 * Hermes en Android detecta que no hay magic bytes HBC
 * y compila el JS en JIT al arrancar la app.
 *
 * Solución para Windows donde hermes-compiler no incluye win64-bin.
 */
'use strict';

const fs = require('fs');
const args = process.argv.slice(2);

let input = null;
let output = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-emit-binary') {
    // flag sin valor, ignorar
  } else if (arg === '-out') {
    output = args[++i];
  } else if (arg === '-output-source-map') {
    i++; // saltar el path del source map
  } else if (arg === '-O' || arg === '-w' || arg === '-output-source-map-relpath') {
    i++; // opciones con valor, ignorar
  } else if (!arg.startsWith('-')) {
    input = arg;
  }
}

if (!input || !output) {
  process.stderr.write('fake-hermesc: input o output no detectados\n');
  process.stderr.write('args: ' + args.join(' ') + '\n');
  process.exit(1);
}

fs.copyFileSync(input, output);
process.exit(0);
