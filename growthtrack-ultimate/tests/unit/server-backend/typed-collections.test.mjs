import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import BaseController from '../../../server/controllers/BaseController.js';
import {collectionPayload,collectionToClient} from '../../../server/collectionPayload.js';
import {fileMetadata,fileToClient} from '../../../server/domains/fileMetadata.js';
import {workoutToClient} from '../../../server/domains/workoutMetadata.js';
import {request,call,migratedFixture} from './fixture.mjs';

const migrations = new URL('../../../prisma/migrations/',import.meta.url);
function migrate(db,beforeTyped=()=>{}) {
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of fs.readdirSync(migrations).sort()) {
    const file=new URL(`${name}/migration.sql`,migrations);
    if (!fs.existsSync(file)) continue;
    if (name==='20261102150000_typed_collection_fields') beforeTyped(db);
    db.exec(fs.readFileSync(file,'utf8'));
  }
}
const seedUser = db => db.exec(`INSERT INTO User(id,email,passwordHash,fullName,referralCode) VALUES ('owner-a','a@example.test','hash','A','ref-a'),('owner-b','b@example.test','hash','B','ref-b')`);

test('general collection migration preserves legacy scalars, children and opaque metadata',()=>{
 const db=new DatabaseSync(':memory:');
 try {
  migrate(db,db=>{
   seedUser(db);
   const insert=(table,id,data)=>db.prepare(`INSERT INTO "${table}"(id,userId,data) VALUES (?, 'owner-a',?)`).run(id,JSON.stringify(data));
   insert('Task','task',{description:'Details',category:'Work',subtasks:[{id:'s1',title:'Step one',done:false}],custom:{provider:'opaque'}});
   insert('NutritionLog','meal',{name:'Lunch',meal:'Lunch',calories:400,protein_g:30,carbs_g:40,fat_g:10});
   insert('ShoppingItem','item',{quantity:2,estimatedCost:12.25,stage:'ordered',priceHistory:[{date:'2026-11-02',price:12.25}]});
   insert('TimesheetSession','time',{project:'Client',seconds:5400,billable:true,earnings:12.25});
   insert('EntertainmentMedia','media',{type:'Series',episode:2,total_episodes:10,rating:8.5});
   insert('Goal','goal',{description:'Read',target_value:10,current_value:2,is_focus:true,deadline:'2026-12-01',subtasks:[{id:123,text:'Open book',done:true}]});
   insert('SleepLog','sleep',{bed_time:'23:00',wake_time:'07:00',duration:8,notes:'Rested'});
   insert('Habit','habit',{icon:'walking',emoji:'📚',target_days:7,completed_dates:['2026-11-01','2026-11-02']});
   insert('SubscriptionItem','sub',{category:'Software',nextDate:'2026-12-01',auto_renew:1,cycle:'monthly'});
   insert('MoodLog','mood',{energy:4,note:'Calm',tags:['calm']});
   insert('VitalsLog','vital',{unit:'bpm',type:'Heart Rate'});
   insert('Medication','med',{frequency:'daily',startDate:'2026-11-01',dose:'One tablet'});
   insert('Task','bad',{description:{unrecognized:true},subtasks:['malformed']});
   insert('NutritionLog','bad-meal',{calories:'not a number',protein_g:12.25});
   db.exec("INSERT INTO Task(id,userId,data) VALUES ('broken-json','owner-a','not json')");
   const vault={key:'a'.repeat(64),bytes:12,mime:'text/plain',sha256:'b'.repeat(64),previewKind:'text',encryption:{format:'aes256gcm-v1',keyId:'c'.repeat(16)}};
   insert('Document','file',{_vault:vault});
   db.exec("INSERT INTO WorkoutSession(id,userId) VALUES ('workout','owner-a')");
   const set={id:'bench-1',exName:'Bench',setNum:1,actualReps:6,actualWeight:40,done:true};
   db.prepare('INSERT INTO WorkoutExercise(id,sessionId,exercise_name,sets,reps,weight_kg,notes) VALUES (?, ?, ?, 1,6,40,?)').run('set','workout','Bench',JSON.stringify({source:'training-session',version:1,setId:'bench-1',index:0,set,payloadHash:'d'.repeat(64)}));
  });
  assert.equal(db.prepare('SELECT description FROM Task WHERE id=?').get('task').description,'Details');
  assert.deepEqual(JSON.parse(db.prepare('SELECT data FROM Task WHERE id=?').get('task').data),{custom:{provider:'opaque'}});
  assert.equal(db.prepare('SELECT title FROM TaskSubtask').get().title,'Step one');
  for (const [table,id] of [['NutritionLog','meal'],['ShoppingItem','item'],['TimesheetSession','time'],['EntertainmentMedia','media'],['Goal','goal'],['SleepLog','sleep'],['Habit','habit'],['SubscriptionItem','sub'],['VitalsLog','vital'],['Medication','med'],['Document','file']]) assert.equal(db.prepare(`SELECT data FROM "${table}" WHERE id=?`).get(id).data,null,`${table} has no duplicated promoted JSON`);
  assert.equal(db.prepare('SELECT count(*) AS n FROM HabitLog').get().n,2);
  assert.equal(db.prepare('SELECT icon FROM Habit WHERE id=?').get('habit').icon,'walking');
  assert.equal(db.prepare('SELECT price FROM ShoppingPrice').get().price,12.25);
  assert.equal(db.prepare('SELECT duration FROM TimesheetSession').get().duration,1.5);
  assert.equal(db.prepare('SELECT targetDate FROM Goal').get().targetDate,'2026-12-01');
  assert.equal(db.prepare('SELECT next_date FROM SubscriptionItem').get().next_date,'2026-12-01');
  const bad=db.prepare('SELECT * FROM Task WHERE id=?').get('bad');
  assert.deepEqual(collectionToClient('tasks',bad).description,{unrecognized:true});
  assert.deepEqual(JSON.parse(db.prepare('SELECT data FROM NutritionLog WHERE id=?').get('bad-meal').data),{calories:'not a number'});
  assert.equal(db.prepare('SELECT data FROM Task WHERE id=?').get('broken-json').data,'not json');
  const file=db.prepare('SELECT * FROM Document').get();
  assert.equal(fileMetadata(file).key,'a'.repeat(64)); assert.equal(fileToClient(file).encryptedAtRest,true);
  const workout=db.prepare('SELECT * FROM WorkoutSession').get(); workout.exercises=db.prepare('SELECT * FROM WorkoutExercise').all();
  assert.equal(workout.exercises[0].notes,null); assert.equal(workoutToClient(workout)._sets[0].actualReps,6);
 } finally {db.close();}
});

test('note/journal snapshots and mood labels backfill without losing malformed/custom metadata or timestamps',async t=>{
 const original={color:'#123456',tags:['work'],source:'mind-journal',date:'2026-11-03',time:'09:30',text:'Synthetic journal',prompt:'A prompt',journalVersion:1,wordCount:2,legacyImportId:'old-entry',pinned:true,starred:false,extension:{provider:'custom'}};
 const malformed={source:{invalid:true},tags:[1,false],wordCount:'unknown',extension:null};
 const {prisma}=await migratedFixture(t,(db,name)=>{
  if(name!=='20261103120000_typed_note_fields')return;
  seedUser(db);
  db.prepare("INSERT INTO Note(id,userId,content,data,kind,pinned,createdAt,updatedAt) VALUES ('note','owner-a',?,?, 'workspace',true,'2026-10-01 10:00:00','2026-10-02 10:00:00')").run('Synthetic journal',JSON.stringify(original));
  db.prepare("INSERT INTO NoteRevision(id,noteId,revision,content,data,actorId) VALUES ('revision','note',1,?,?,'owner-a')").run('Synthetic journal',JSON.stringify(original));
  db.prepare("INSERT INTO Note(id,userId,data) VALUES ('malformed','owner-a',?)").run(JSON.stringify(malformed));
  db.prepare("INSERT INTO Note(id,userId,data) VALUES ('old-tags','owner-a',?)").run(JSON.stringify({tags:'legacy label text'}));
  db.exec("INSERT INTO Note(id,userId,data) VALUES ('broken','owner-a','not json')");
  db.prepare("INSERT INTO MoodLog(id,userId,data) VALUES ('mood','owner-a',?)").run(JSON.stringify({tags:['calm'],extra:{keep:true}}));
 });
 const row=await prisma.note.findUnique({where:{id:'note'}});
 assert.equal(row.wordCount,2); assert.equal(row.source,'mind-journal'); assert.equal(row.tags,'["work"]');
 assert.equal(row.kind,'mind-journal');
 assert.deepEqual(JSON.parse(row.data),{extension:original.extension});
 assert.equal(row.updatedAt.toISOString(),'2026-10-02T10:00:00.000Z');
 const snapshot=await prisma.noteRevision.findUnique({where:{id:'revision'}});
 assert.equal(snapshot.pinned,true); assert.equal(snapshot.source,'mind-journal'); assert.equal(snapshot.wordCount,2);
 assert.deepEqual(JSON.parse(snapshot.data),{extension:original.extension});
 assert.deepEqual(JSON.parse((await prisma.note.findUnique({where:{id:'malformed'}})).data),malformed);
 assert.equal((await prisma.note.findUnique({where:{id:'broken'}})).data,'not json');
 assert.deepEqual(JSON.parse((await prisma.note.findUnique({where:{id:'old-tags'}})).data),{tags:'legacy label text'});
 const mood=await prisma.moodLog.findUnique({where:{id:'mood'}});
 assert.equal(mood.tags,'["calm"]'); assert.deepEqual(JSON.parse(mood.data),{extra:{keep:true}});
});

test('note migration preserves flags written by legacy clients after the earlier flag backfill',async t=>{
 const cases=[
  ['boolean-true',{pinned:true,starred:true},[false,false],[true,true],{}],
  ['boolean-false',{pinned:false,starred:false},[true,true],[false,false],{}],
  ['integer-flags',{pinned:1,starred:0},[false,true],[true,false],{}],
  ['absent-flags',{},[true,true],[true,true],{}],
  ['malformed-flags',{pinned:'true',starred:2},[true,false],[true,false],{pinned:'true',starred:2}],
  ['null-flags',{pinned:null,starred:null},[true,false],[true,false],{pinned:null,starred:null}],
 ];
 const {prisma}=await migratedFixture(t,(db,name)=>{
  if(name!=='20261103120000_typed_note_fields')return;
  seedUser(db);
  const insert=db.prepare("INSERT INTO Note(id,userId,data,pinned,starred,createdAt,updatedAt) VALUES (?,'owner-a',?,?,?,'2026-10-01 10:00:00','2026-10-02 10:00:00')");
  for(const [id,flags,columns] of cases)insert.run(id,JSON.stringify({...flags,extension:'keep'}),Number(columns[0]),Number(columns[1]));
 });
 for(const [id,, ,expected,residual] of cases){
  const row=await prisma.note.findUnique({where:{id}});
  assert.deepEqual([row.pinned,row.starred],expected,id);
  assert.deepEqual(JSON.parse(row.data),{...residual,extension:'keep'},id);
  assert.equal(row.updatedAt.toISOString(),'2026-10-02T10:00:00.000Z',id);
 }
});

test('actual collection create/read/update stores typed scalars and relational children atomically',async t=>{
 const {prisma}=await migratedFixture(t);
 const cases=[
  ['tasks','task',{title:'Work',description:'Details',category:'Work',subtasks:[{id:'s1',title:'Step one',done:false}]},'description'],
  ['nutrition_logs','nutritionLog',{name:'Lunch',meal:'Lunch',calories:400,protein_g:30},'calories'],
  ['shopping','shoppingItem',{name:'Book',quantity:2,estimatedCost:12.25,stage:'ordered',priceHistory:[{date:'2026-11-02',price:12.25}]},'estimatedCost'],
  ['timesheet','timesheetSession',{date:'2026-11-02',seconds:5400,project:'Client',billable:true,earnings:12.25},'project'],
  ['entertainment','entertainmentMedia',{title:'Series',type:'Series',episode:2,rating:8.5},'episode'],
  ['goals','goal',{title:'Read',description:'Read ten books',category:'learning',status:'active',priority:'high',target_value:10,current_value:2,unit:'books',deadline:'2026-12-01',is_focus:true,subtasks:[{id:'step',text:'Start',done:false}]},'target_value'],
  ['sleep_logs','sleepLog',{date:'2026-11-02',duration:8,quality:8,bed_time:'23:00',wake_time:'07:00',notes:'Rested'},'bed_time'],
  ['habits','habit',{name:'Read',icon:'book',emoji:'📚',target_days:7,completed_dates:['2026-11-02']},'target_days'],
  ['subscriptions','subscriptionItem',{name:'Software',cost:10,category:'Software',cycle:'monthly',nextDate:'2026-12-01',auto_renew:1},'cycle'],
  ['mood_logs','moodLog',{date:'2026-11-02',mood:4,energy:4,note:'Calm',tags:['calm']},'energy'],
  ['vitals_logs','vitalsLog',{date:'2026-11-02',type:'Heart Rate',value:60,unit:'bpm'},'unit'],
  ['medications','medication',{name:'Supplement',dose:'One tablet',frequency:'daily',start_date:'2026-11-02'},'frequency'],
 ];
 for (const [collection,model,input,field] of cases) {
  const controller=new BaseController(prisma[model],collection,null,null,null,prisma);
  const created=await call(controller.create.bind(controller),request(input));
  assert.equal(created.statusCode,200,`${collection}: ${JSON.stringify(created.body)}`);
  const row=await prisma[model].findUnique({where:{id:created.body.id}});
  assert.ok(Object.hasOwn(row,field));
  assert.equal(Object.hasOwn(JSON.parse(row.data || '{}'),field),false);
  assert.equal(row.data,null,`${collection}: regular fields must not duplicate into catch-all JSON`);
  const list=await call(controller.getAll.bind(controller),request()); assert.equal(list.body[0][field],created.body[field]);
  const updated=await call(controller.update.bind(controller),request({[field]:null,expectedUpdatedAt:row.updatedAt.toISOString()},'owner-a',row.id));
  assert.equal(updated.statusCode,200,`${collection} update`);
  const cleared=(await call(controller.getAll.bind(controller),request())).body[0]; assert.equal(cleared[field],null,`${collection} null clearing`);
 }
 const task=await prisma.task.findFirst({include:{subtaskRows:true}});
 assert.equal(task.subtaskRows.length,1);
 const tasks=new BaseController(prisma.task,'tasks',null,null,null,prisma);
 const conflict=await call(tasks.update.bind(tasks),request({subtasks:[],expectedUpdatedAt:new Date(0).toISOString()},'owner-a',task.id));
 assert.equal(conflict.statusCode,409); assert.equal(await prisma.taskSubtask.count(),1);
 const clear=await call(tasks.update.bind(tasks),request({subtasks:[],expectedUpdatedAt:task.updatedAt.toISOString()},'owner-a',task.id));
 assert.equal(clear.statusCode,200); assert.equal(await prisma.taskSubtask.count(),0);
 assert.throws(()=>collectionPayload('shopping',{quantity:1.5}),/whole number/);
 assert.throws(()=>collectionPayload('nutrition_logs',{calories:'NaN'}),/finite number/);
 assert.throws(()=>collectionPayload('shopping',{estimatedCost:1.001}),/two decimal/);
 assert.throws(()=>collectionPayload('notes',{pinned:null}),/boolean flag/);
 assert.throws(()=>collectionPayload('mood_logs',{tags:[false]}),/text labels/);
});
