const invalid = message => { throw Object.assign(new Error(message), {status:400}); };

export const COLLECTION_CHILDREN = Object.freeze({
  tasks: {field:'subtasks',relation:'subtaskRows',model:'taskSubtask',parentModel:'task',foreignKey:'taskId',text:'title'},
  goals: {field:'subtasks',relation:'subtaskRows',model:'goalSubtask',parentModel:'goal',foreignKey:'goalId',text:'text'},
  shopping: {field:'priceHistory',relation:'priceRows',model:'shoppingPrice',parentModel:'shoppingItem',foreignKey:'itemId'},
  habits: {field:'completed_dates',relation:'logs',model:'habitLog',parentModel:'habit',foreignKey:'habitId'},
});

export function collectionInclude(name) {
  if (name === 'workout_sessions') return {exercises:true};
  const spec = COLLECTION_CHILDREN[name];
  return spec ? {[spec.relation]:true} : undefined;
}

export function collectionChildPayload(name, source) {
  const spec = COLLECTION_CHILDREN[name];
  if (!spec || !Object.hasOwn(source,spec.field)) return null;
  const values = source[spec.field];
  if (!Array.isArray(values) || values.length > 1000) invalid(`${spec.field} must be an array of at most 1,000 records.`);
  const seen = new Set();
  const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) === date;
  const rows = values.map((value,position) => {
    if (name === 'habits') {
      if (!validDate(value) || seen.has(value)) invalid('Completed habit dates must be valid unique YYYY-MM-DD dates.');
      seen.add(value); return {date:value};
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${spec.field} requires record objects.`);
    if (name === 'shopping') {
      if (Object.keys(value).some(key=>!['date','price'].includes(key)) || !validDate(value.date)
        || typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price < 0 || value.price > 1e12 || value.price !== Math.round(value.price * 100) / 100) invalid('Price history requires a valid date and non-negative price with at most two decimals.');
      return {position,date:value.date,price:value.price};
    }
    if (Object.keys(value).some(key=>!['id',spec.text,'done'].includes(key))
      || !['string','number'].includes(typeof value.id) || !String(value.id).trim() || String(value.id).length > 160
      || seen.has(String(value.id)) || typeof value[spec.text] !== 'string' || !value[spec.text].trim()
      || typeof value.done !== 'boolean') invalid('Subtasks require unique identifiers, text and a completed flag.');
    seen.add(String(value.id));
    return {id:String(value.id),[spec.text]:value[spec.text],done:value.done,position};
  });
  return {spec,rows};
}

export function childrenToClient(name,record,result) {
  const spec = COLLECTION_CHILDREN[name];
  if (!spec || !Array.isArray(record[spec.relation])) return;
  const rows = record[spec.relation];
  // Valid legacy arrays are migrated and removed; malformed arrays remain
  // visible until explicitly corrected rather than being silently discarded.
  if (rows.length || !Object.hasOwn(result,spec.field)) {
    if (name === 'habits') result.completed_dates = rows.map(row=>row.date).sort();
    else result[spec.field] = [...rows].sort((a,b)=>a.position-b.position).map(row=> name === 'shopping'
      ? {date:row.date,price:row.price}
      : {id:row.id,[spec.text]:row[spec.text],done:Boolean(row.done)});
  }
  delete result[spec.relation];
}
