// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config';

export default defineCloudflareConfig({
  // __name 问题通过 wrangler.jsonc 的 keep_names: false 解决
  // 参考：https://opennext.js.org/cloudflare/howtos/keep_names
});
