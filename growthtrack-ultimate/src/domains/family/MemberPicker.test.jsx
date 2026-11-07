import React from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {afterEach,describe,expect,it,vi} from 'vitest';
import MemberPicker from './MemberPicker';
import NewPersonFields from './NewPersonFields';
const account={owner:'fixture-owner',authMode:'ultimate',user:{id:'fixture-family'}},people=[{id:'a',name:'Fictional A'},{id:'b',name:'Fictional B'}],clients=[];
function show(component){const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});clients.push(client);return render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);}
afterEach(()=>{cleanup();clients.splice(0).forEach(client=>client.clear());vi.unstubAllGlobals();});
describe('searchable person selection',()=>{
 it('requires a selected result and supports keyboard selection and clearing',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({rows:people})})));
  const pick=vi.fn();const {container}=show(<form><MemberPicker name="personId" label="Relative" account={account} treeId="tree" initial={people} optional={false} onPick={pick}/></form>);
  const input=screen.getByRole('combobox',{name:'Relative'});await userEvent.type(input,'Fictional');
  expect(input.checkValidity()).toBe(false);await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(input.checkValidity()).toBe(true);expect(container.querySelector('[name=personId]').value).toBe('a');expect(pick).toHaveBeenLastCalledWith(people[0]);
 });
 it('does not silently submit an optional typed name without choosing a result',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({rows:[]})})));
  show(<MemberPicker name="personId" label="Optional relative" account={account} treeId="tree" initial={people}/>);
  const input=screen.getByRole('combobox',{name:'Optional relative'});expect(input.checkValidity()).toBe(true);await userEvent.type(input,'Not selected');expect(input.checkValidity()).toBe(false);await userEvent.clear(input);expect(input.checkValidity()).toBe(true);
 });
 it('can remove the optional connection without a second checkbox',async()=>{
  show(<NewPersonFields account={account} treeId="tree" people={people} anchor={people[0]} currentMe={people[0]}/>);
  expect(screen.queryByRole('checkbox',{name:'Connect them to someone in this tree'})).toBeNull();
  await userEvent.click(screen.getByRole('button',{name:'Clear Person already in your tree'}));
  expect(screen.queryByRole('combobox',{name:'Relationship to this person'})).toBeNull();
  expect(screen.getByText(/save a standalone person/)).toBeVisible();
 });
 it('shows an existing-person preview with both names and no new-person copy',async()=>{
  const {default:RelationshipFields}=await import('./RelationshipFields');
  show(<RelationshipFields account={account} treeId="tree" people={people} anchor={people[0]}/>);
  const input=screen.getByRole('combobox',{name:'Their relative'});await userEvent.click(input);await userEvent.click(screen.getByRole('option',{name:'Fictional B'}));
  await userEvent.selectOptions(screen.getByRole('combobox',{name:'Relationship to this person'}),'appa');
  expect(screen.getByRole('status')).toHaveTextContent('Fictional B will be recorded as அப்பா');expect(screen.getByRole('status')).toHaveTextContent('of Fictional A');expect(screen.queryByText(/The new person/)).toBeNull();
 });
});
