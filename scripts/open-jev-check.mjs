#!/usr/bin/env node
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {report,checkReport,sources} from './open-jev-lib.mjs';
const doc=report();checkReport(doc);
if(doc&&doc.catalog_id!==sources().catalog.catalog_id)throw Error('Open JEV catalog ID mismatch');
console.log(doc?'Open JEV report valid: '+doc.entries.length+' entries':'No experimental Open JEV report; permitted');
