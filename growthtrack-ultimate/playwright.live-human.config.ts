import {defineConfig,devices} from '@playwright/test';
import path from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('.tmp/playwright-browsers');
export default defineConfig({testDir:'./tests/e2e',testMatch:['**/live-human-desktop.spec.ts'],workers:1,retries:0,timeout:180000,use:{actionTimeout:15000,viewport:{width:1440,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},projects:[
  {name:'windows-chrome',use:{...devices['Desktop Chrome'],channel:'chrome'}},
  {name:'windows-edge',use:{...devices['Desktop Edge'],channel:'msedge'}},
  {name:'webkit-compatibility',use:{...devices['Desktop Safari']}},
]});
