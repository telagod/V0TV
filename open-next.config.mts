// default open-next.config.ts file created by @opennextjs/cloudflare
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
	// R2 增量缓存已禁用

	// 修复 __name is not defined 错误
	// 禁用 minify 避免生成 __name 辅助函数
	dangerous: {
		minify: false,
	},
};

export default config;
