import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {ProjectSession,createProjectPackage,openProjectPackage,normalizeRecipe} from '../../app/workbench/project.js';
import {templates} from '../../app/workbench/material-maps.js';
import {generatorVersion as softFoldsVersion} from '../../app/workbench/soft-folds.js';
import {readStoredZip,writeStoredZip} from '../../app/workbench/zip-store.js';
import {createTrialHandoff,openTrialHandoff} from '../../app/workbench/trial-handoff.js';

const tinyPng=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64'));
const recipe={seed:2048,density:.42,depth:.18,direction:35};
async function packageForTest(){return createProjectPackage({sourceBytes:tinyPng,sourceName:'test.png',sourceMime:'image/png',sourceWidth:1,sourceHeight:1,recipe,mapWidth:64,mapHeight:48,angle:5});}

test('project package reopens with identical source and two generated maps',async()=>{
  const archive=await packageForTest(),opened=await openProjectPackage(archive);
  assert.deepEqual(opened.recipe,normalizeRecipe(recipe));
  assert.equal(opened.angle,5);
  assert.deepEqual(opened.sourceBytes,tinyPng);
  assert.equal(opened.maps.normal.data.length,64*48*4);
  assert.equal(opened.maps.surface.data.length,64*48*4);
  assert.notDeepEqual(opened.maps.normal.data,opened.maps.surface.data);
  mkdirSync('.test-output',{recursive:true});writeFileSync('.test-output/p1-sample.luster',archive);
});
test('all material templates survive project roundtrip',async()=>{
  for(const template of templates){
    const archive=await createProjectPackage({sourceBytes:tinyPng,sourceName:'test.png',sourceMime:'image/png',sourceWidth:1,sourceHeight:1,recipe:{...recipe,template},mapWidth:64,mapHeight:48});
    const opened=await openProjectPackage(archive);
    assert.equal(opened.recipe.template,template);
    assert.equal(opened.manifest.template,template);
  }
});
test('schema 2 soft folds project and trial handoff still open',async()=>{
  const projectFiles=readStoredZip(await packageForTest());
  const projectManifest=JSON.parse(new TextDecoder().decode(projectFiles.get('manifest.json')));
  projectManifest.schemaVersion=2;projectManifest.generatorVersion=softFoldsVersion;
  delete projectManifest.template;delete projectManifest.recipe.template;
  projectFiles.set('manifest.json',new TextEncoder().encode(JSON.stringify(projectManifest)));
  const project=await openProjectPackage(writeStoredZip(projectFiles));
  assert.equal(project.recipe.template,'soft-folds');
  const trialFiles=readStoredZip(await createTrialHandoff({recipe,includeArtwork:false}));
  const trialManifest=JSON.parse(new TextDecoder().decode(trialFiles.get('manifest.json')));
  trialManifest.schemaVersion=2;trialManifest.generatorVersion=softFoldsVersion;
  delete trialManifest.template;delete trialManifest.recipe.template;
  trialFiles.set('manifest.json',new TextEncoder().encode(JSON.stringify(trialManifest)));
  const handoff=await openTrialHandoff(writeStoredZip(trialFiles));
  assert.equal(handoff.recipe.template,'soft-folds');
});
test('archive rejects corruption, traversal, version drift and changed recipe',async()=>{
  const archive=await packageForTest(),corrupt=archive.slice();corrupt[50]^=1;
  await assert.rejects(openProjectPackage(corrupt),/CRC mismatch/);
  assert.throws(()=>writeStoredZip(new Map([['../escape.txt',tinyPng]])),/Unsafe archive path/);
  const files=readStoredZip(archive),manifest=JSON.parse(new TextDecoder().decode(files.get('manifest.json')));
  manifest.schemaVersion=4;files.set('manifest.json',new TextEncoder().encode(JSON.stringify(manifest)));
  await assert.rejects(openProjectPackage(writeStoredZip(files)),/Unsupported project/);
  manifest.schemaVersion=3;manifest.recipe.seed++;
  files.set('manifest.json',new TextEncoder().encode(JSON.stringify(manifest)));
  await assert.rejects(openProjectPackage(writeStoredZip(files)),/maps do not match recipe/);
});
test('revision-aware material edits, undo and view updates',()=>{
  const session=new ProjectSession(recipe);
  assert.equal(session.apply({depth:.2},0).revision,1);
  assert.throws(()=>session.apply({seed:4},0),/Revision conflict/);
  assert.throws(()=>session.apply({depth:9},1),RangeError);
  assert.equal(session.read().revision,1);
  assert.equal(session.undo(1).recipe.depth,.18);
  assert.equal(session.redo(2).recipe.depth,.2);
  assert.equal(session.setViewAngle(7).revision,3);
  assert.equal(session.read().viewRevision,1);
  assert.throws(()=>session.apply({remoteUrl:'https://example.com'},3),/Unknown or malformed/);
});
test('trial handoff carries selected recipe and optional artwork only',async()=>{
  const full=await createTrialHandoff({recipe,includeArtwork:true,sourceBytes:tinyPng,sourceMime:'image/png',sourceName:'test.png',sourceWidth:1,sourceHeight:1});
  const opened=await openTrialHandoff(full);
  assert.deepEqual(opened.recipe,normalizeRecipe(recipe));assert.deepEqual(opened.sourceBytes,tinyPng);
  assert.equal(readStoredZip(full).size,2);
  const recipeOnly=await createTrialHandoff({recipe,includeArtwork:false});
  const reopened=await openTrialHandoff(recipeOnly);
  assert.equal(reopened.sourceBytes,null);assert.equal(reopened.manifest.needsImage,true);
  assert.equal(readStoredZip(recipeOnly).size,1);
});
test('trial handoff preserves every template',async()=>{
  for(const template of templates){
    const archive=await createTrialHandoff({recipe:{...recipe,template},includeArtwork:false});
    const opened=await openTrialHandoff(archive);
    assert.equal(opened.recipe.template,template);
  }
});
