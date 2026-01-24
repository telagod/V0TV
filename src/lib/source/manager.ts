/**
 * 源管理器
 * 统一管理所有视频源的搜索和详情获取
 */

import { ApiSite } from '@/lib/types';

import { SpecialSourceAdapter } from './adapters/special';
import { StandardSourceAdapter } from './adapters/standard';
import { ISourceAdapter, SearchResultItem } from './types';

// ============================================================================
// 源管理器
// ============================================================================

/**
 * 源管理器 - 单例
 * 自动选择合适的适配器处理请求
 */
class SourceManager {
  private adapters: ISourceAdapter[] = [];

  constructor() {
    // 注册适配器 (顺序重要：特殊源优先匹配)
    this.adapters = [
      new SpecialSourceAdapter(),
      new StandardSourceAdapter(),
    ];
  }

  /**
   * 注册自定义适配器
   */
  registerAdapter(adapter: ISourceAdapter): void {
    // 插入到标准适配器之前
    this.adapters.unshift(adapter);
  }

  /**
   * 获取适配器
   */
  private getAdapter(apiSite: ApiSite): ISourceAdapter {
    for (const adapter of this.adapters) {
      if (adapter.supports(apiSite)) {
        return adapter;
      }
    }

    // 默认使用标准适配器
    return this.adapters[this.adapters.length - 1];
  }

  /**
   * 搜索
   */
  async search(apiSite: ApiSite, query: string): Promise<SearchResultItem[]> {
    const adapter = this.getAdapter(apiSite);
    return adapter.search(apiSite, query);
  }

  /**
   * 获取详情
   */
  async getDetail(apiSite: ApiSite, id: string): Promise<SearchResultItem> {
    const adapter = this.getAdapter(apiSite);
    return adapter.getDetail(apiSite, id);
  }

  /**
   * 批量搜索 (并发)
   */
  async searchMultiple(
    apiSites: ApiSite[],
    query: string,
  ): Promise<SearchResultItem[]> {
    const promises = apiSites.map((site) =>
      this.search(site, query).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[searchMultiple] ${site.name} (${site.key}) 搜索失败:`, err);
        return [] as SearchResultItem[];
      }),
    );

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * 获取所有已注册的适配器信息
   */
  getAdapters(): { key: string; name: string }[] {
    return this.adapters.map((a) => ({ key: a.key, name: a.name }));
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const sourceManager = new SourceManager();

// ============================================================================
// 兼容层 - 保持向后兼容
// ============================================================================

/**
 * @deprecated 使用 sourceManager.search 替代
 */
export async function searchFromApi(
  apiSite: ApiSite,
  query: string,
): Promise<SearchResultItem[]> {
  return sourceManager.search(apiSite, query);
}

/**
 * @deprecated 使用 sourceManager.getDetail 替代
 */
export async function getDetailFromApi(
  apiSite: ApiSite,
  id: string,
): Promise<SearchResultItem> {
  return sourceManager.getDetail(apiSite, id);
}
