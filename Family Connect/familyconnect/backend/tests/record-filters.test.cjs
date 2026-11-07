const test=require('node:test'),assert=require('node:assert/strict');
const {memberWhere,eventWhere,documentWhere}=require('../dist/services/recordFilters');
test('living filters scope both search and totals to the selected tree',()=>{
 assert.deepEqual(memberWhere('tree-a',{life:'living',search:' Test '}),{treeId:'tree-a',name:{contains:'Test',mode:'insensitive'},deathDate:null});
 assert.deepEqual(memberWhere('tree-a',{life:'deceased'}),{treeId:'tree-a',deathDate:{not:null}});
 assert.deepEqual(memberWhere('tree-a',{}),{treeId:'tree-a'});
 assert.throws(()=>memberWhere('tree-a',{life:['living']}));
});
test('milestone and document filters retain parent-tree scope and reject malformed types',()=>{
 assert.deepEqual(eventWhere('tree-a',{type:'birthday',memberId:'person-a'}),{treeId:'tree-a',type:'birthday',memberId:'person-a'});
 assert.deepEqual(documentWhere('tree-a',{type:'photo',memberId:'person-a'}),{treeId:'tree-a',type:'photo',memberId:'person-a'});
 assert.throws(()=>eventWhere('tree-a',{type:'invented'}));assert.throws(()=>documentWhere('tree-a',{memberId:{id:'other'}}));
});
