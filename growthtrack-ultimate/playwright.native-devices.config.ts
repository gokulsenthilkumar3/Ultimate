import {defineConfig,devices} from '@playwright/test';
import foundation from './playwright.foundation.config';
export default defineConfig({...foundation,testMatch:['**/native-anatomy-review.spec.ts'],workers:1,timeout:120000,
  projects:[
    {name:'desktop-chrome',use:{...devices['Desktop Chrome'],channel:'chrome'}},
    {name:'android-viewport',use:{...devices['Pixel 7'],channel:'chrome'}},
    {name:'tablet-viewport',use:{...devices['iPad Pro 11'],browserName:'chromium',channel:'chrome'}},
  ]});
