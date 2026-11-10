import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests', timeout:60000, expect:{timeout:12000}, fullyParallel:false,
  workers:1, reporter:[['list']],
  use:{baseURL:'http://127.0.0.1:5173', headless:true, channel:'chrome', viewport:{width:1440,height:1000}, trace:'retain-on-failure'},
});
