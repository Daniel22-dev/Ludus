#!/usr/bin/env node
import { sanitizeTechnicalText } from '../public/access/error-reporter.js';

const key = 'AI' + 'za' + 'x'.repeat(35);
const input = `request failed: ${key}; https://example.test/v1/models?key=XYZ&mode=test`;
const cleaned = sanitizeTechnicalText(input, 1000);
if (cleaned.includes(key)) throw new Error('Google API key AIza… zůstal po sanitizaci.');
if (cleaned.includes('XYZ')) throw new Error('Hodnota URL parametru ?key= zůstala po sanitizaci.');
if (!cleaned.includes('[klíč odstraněn]')) throw new Error('Chybí placeholder pro odstraněný AIza klíč.');
if (!cleaned.includes('?key=[odstraněno]')) throw new Error('Chybí placeholder pro odstraněný parametr key.');
console.log('PASS: error reporter sanitizer odstraňuje AIza klíč i ?key= hodnotu.');
