// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
	// R2 增量缓存已禁用

	// 修复 __name is not defined 错误
	// 直接配置 esbuild 选项
	overrides: {
		wrapper: {
			// 禁用函数名保留
			esbuildOptions: {
				keepNames: false,
				minifyIdentifiers: false,
				minifySyntax: false,
				minifyWhitespace: true,
			},
		},
		converter: {
			esbuildOptions: {
				keepNames: false,
				minifyIdentifiers: false,
				minifySyntax: false,
				minifyWhitespace: true,
			},
		},
	},
});
