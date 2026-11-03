#!/usr/bin/env node
import {report,checkReport,sources} from './open-jev-lib.mjs';
try{
 const doc=report();
 if(!doc)throw Error('Canonical scores are missing; run npm run sync:scores');
 checkReport(doc,sources());
 console.log('Open JEV scores valid: '+JSON.stringify(doc.summary));
}catch(error){console.error(error.message);process.exitCode=1;}
