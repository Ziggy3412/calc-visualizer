import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizePreferences,DEFAULT_PREFERENCES,THEMES,COLOR_FIELDS} from '../src/shared/preferences.js'
test('older saved preferences gain comfortable spacing without losing custom colors',()=>{
 const result=normalizePreferences({theme:'midnight',curve1:'#123456',textSize:16})
 assert.equal(result.density,'comfortable');assert.equal(result.curve1,'#123456');assert.equal(result.textSize,16)
})
test('preferences reject unsafe values and clamp controls to supported ranges',()=>{
 const p=normalizePreferences({density:'invalid',textSize:100,lineWidth:-2,lighting:NaN,panelWidth:10,showAxes:'false',curve1:'red'})
 assert.equal(p.density,'comfortable');assert.equal(p.textSize,18);assert.equal(p.lineWidth,1);assert.equal(p.lighting,1);assert.equal(p.panelWidth,280);assert.equal(p.showAxes,true);assert.equal(p.curve1,DEFAULT_PREFERENCES.curve1)
 assert.equal(normalizePreferences({density:'compact'}).density,'compact')
})
test('every theme supplies a full usable graph, drawing, and lighting palette',()=>{
 for(const theme of THEMES)for(const [key]of COLOR_FIELDS)assert.match(theme.colors[key],/^#[0-9a-f]{6}$/i,`${theme.id} ${key}`)
})
