/* eslint-disable no-console */

'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Download,
  FolderOpen,
  Plus,
  Settings,
  Trash2,
  Tv,
  Users,
  Video,
  X,
} from 'lucide-react';
import { GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { RuntimeConfig } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

// 统一提示方法
const showError = (message: string) => toast.error(message);
const showSuccess = (message: string) => toast.success(message);

// 新增站点配置类型
interface SiteConfig {
  SiteName: string;
  Announcement: string;
  SearchDownstreamMaxPage: number;
  SiteInterfaceCacheTime: number;
  ImageProxy: string;
  DoubanProxy: string;
}

// 视频源数据类型
interface DataSource {
  name: string;
  key: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from: 'config' | 'custom';
  is_adult?: boolean; // 添加成人内容标记字段
}

type SourceActionPayload =
  | { action: 'enable' | 'disable' | 'delete'; key: string }
  | {
      action: 'add';
      key: string;
      name: string;
      api: string;
      detail?: string;
      is_adult?: boolean;
    }
  | {
      action: 'update';
      key: string;
      is_adult?: boolean;
      name?: string;
      api?: string;
      detail?: string;
    }
  | { action: 'sort'; order: string[] };

type StorageType = 'localstorage' | 'redis' | 'upstash' | 'd1';

type WindowWithRuntime = Window & { RUNTIME_CONFIG?: RuntimeConfig };

const getRuntimeStorageType = (): StorageType | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as WindowWithRuntime).RUNTIME_CONFIG?.STORAGE_TYPE as
    | StorageType
    | undefined;
};

interface ConfigFileEntry {
  api: string;
  name: string;
  detail?: string;
  is_adult?: boolean;
}

interface ConfigExportFile {
  cache_time: number;
  api_site: Record<string, ConfigFileEntry>;
}

interface ConfigImportFile {
  cache_time?: number;
  api_site: Record<string, Partial<ConfigFileEntry>>;
}

// 可折叠标签组件
interface CollapsibleTabProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleTab = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: CollapsibleTabProps) => {
  return (
    <div className='rounded-xl shadow-sm mb-4 overflow-hidden bg-surface-secondary ring-1 ring-stroke-primary'>
      <button
        onClick={onToggle}
        className='w-full px-6 py-4 flex items-center justify-between bg-surface-tertiary hover:bg-surface-hover transition-colors'
      >
        <div className='flex items-center gap-3'>
          {icon}
          <h3 className='text-lg font-medium text-content-primary'>
            {title}
          </h3>
        </div>
        <div className='text-content-tertiary'>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && <div className='px-6 py-4'>{children}</div>}
    </div>
  );
};

// 用户配置组件
interface UserConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
}

const UserConfig = ({ config, role, refreshConfig }: UserConfigProps) => {
  const { confirm: showConfirm } = useConfirmDialog();
  const [userSettings, setUserSettings] = useState({
    enableRegistration: false,
  });
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
  });
  const [changePasswordUser, setChangePasswordUser] = useState({
    username: '',
    password: '',
  });

  // 当前登录用户名
  const currentUsername = getAuthInfoFromBrowserCookie()?.username || null;

  // 检测存储类型是否为 d1
  const runtimeStorageType = getRuntimeStorageType();
  const isD1Storage = runtimeStorageType === 'd1';
  const isUpstashStorage = runtimeStorageType === 'upstash';

  useEffect(() => {
    if (config?.UserConfig) {
      setUserSettings({
        enableRegistration: config.UserConfig.AllowRegister,
      });
    }
  }, [config]);

  // 切换允许注册设置
  const toggleAllowRegister = async (value: boolean) => {
    try {
      // 先更新本地 UI
      setUserSettings((prev) => ({ ...prev, enableRegistration: value }));

      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setAllowRegister',
          allowRegister: value,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${res.status}`);
      }

      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
      // revert toggle UI
      setUserSettings((prev) => ({ ...prev, enableRegistration: !value }));
    }
  };

  const handleBanUser = async (uname: string) => {
    await handleUserAction('ban', uname);
  };

  const handleUnbanUser = async (uname: string) => {
    await handleUserAction('unban', uname);
  };

  const handleSetAdmin = async (uname: string) => {
    await handleUserAction('setAdmin', uname);
  };

  const handleRemoveAdmin = async (uname: string) => {
    await handleUserAction('cancelAdmin', uname);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    await handleUserAction('add', newUser.username, newUser.password);
    setNewUser({ username: '', password: '' });
    setShowAddUserForm(false);
  };

  const handleChangePassword = async () => {
    if (!changePasswordUser.username || !changePasswordUser.password) return;
    await handleUserAction(
      'changePassword',
      changePasswordUser.username,
      changePasswordUser.password,
    );
    setChangePasswordUser({ username: '', password: '' });
    setShowChangePasswordForm(false);
  };

  const handleShowChangePasswordForm = (username: string) => {
    setChangePasswordUser({ username, password: '' });
    setShowChangePasswordForm(true);
    setShowAddUserForm(false); // 关闭添加用户表单
  };

  const handleDeleteUser = async (username: string) => {
    const isConfirmed = await showConfirm({
      title: '确认删除用户',
      message: `删除用户 ${username} 将同时删除其搜索历史、播放记录和收藏夹，此操作不可恢复！`,
      type: 'warning',
      confirmText: '确认删除',
      cancelText: '取消',
    });

    if (!isConfirmed) return;

    await handleUserAction('deleteUser', username);
  };

  // 通用请求函数
  const handleUserAction = async (
    action:
      | 'add'
      | 'ban'
      | 'unban'
      | 'setAdmin'
      | 'cancelAdmin'
      | 'changePassword'
      | 'deleteUser',
    targetUsername: string,
    targetPassword?: string,
  ) => {
    try {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUsername,
          ...(targetPassword ? { targetPassword } : {}),
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${res.status}`);
      }

      // 成功后刷新配置（无需整页刷新）
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
    }
  };

  if (!config) {
    return (
      <div className='text-center text-content-secondary'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 用户统计 */}
      <div>
        <h4 className='text-sm font-medium text-content-secondary mb-3'>
          用户统计
        </h4>
        <div className='p-4 bg-success/10 rounded-lg border border-success/20'>
          <div className='text-2xl font-bold text-success'>
            {config.UserConfig.Users.length}
          </div>
          <div className='text-sm text-success/80'>
            总用户数
          </div>
        </div>
      </div>

      {/* 注册设置 */}
      <div>
        <h4 className='text-sm font-medium text-content-secondary mb-3'>
          注册设置
        </h4>
        <div className='flex items-center justify-between'>
          <label
            className={`text-content-secondary ${
              isD1Storage || isUpstashStorage ? 'opacity-50' : ''
            }`}
          >
            允许新用户注册
            {isD1Storage && (
              <span className='ml-2 text-xs text-content-tertiary'>
                (D1 环境下请通过环境变量修改)
              </span>
            )}
            {isUpstashStorage && (
              <span className='ml-2 text-xs text-content-tertiary'>
                (Upstash 环境下请通过环境变量修改)
              </span>
            )}
          </label>
          <button
            onClick={() =>
              !isD1Storage &&
              !isUpstashStorage &&
              toggleAllowRegister(!userSettings.enableRegistration)
            }
            disabled={isD1Storage || isUpstashStorage}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 focus:ring-offset-surface-primary ${
              userSettings.enableRegistration
                ? 'bg-success'
                : 'bg-surface-hover'
            } ${
              isD1Storage || isUpstashStorage
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                userSettings.enableRegistration
                  ? 'translate-x-6'
                  : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <h4 className='text-sm font-medium text-content-secondary'>
            用户列表
          </h4>
          <button
            onClick={() => {
              setShowAddUserForm(!showAddUserForm);
              if (showChangePasswordForm) {
                setShowChangePasswordForm(false);
                setChangePasswordUser({ username: '', password: '' });
              }
            }}
            className='px-3 py-1 bg-success hover:bg-success/80 text-surface-primary text-sm rounded-lg transition-colors'
          >
            {showAddUserForm ? '取消' : '添加用户'}
          </button>
        </div>

        {/* 添加用户表单 */}
        {showAddUserForm && (
          <div className='mb-4 p-4 bg-surface-tertiary rounded-lg border border-stroke-primary'>
            <div className='flex flex-col sm:flex-row gap-4 sm:gap-3'>
              <input
                type='text'
                placeholder='用户名'
                value={newUser.username}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, username: e.target.value }))
                }
                className='flex-1 px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent'
              />
              <input
                type='password'
                placeholder='密码'
                value={newUser.password}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, password: e.target.value }))
                }
                className='flex-1 px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent'
              />
              <button
                onClick={handleAddUser}
                disabled={!newUser.username || !newUser.password}
                className='w-full sm:w-auto px-4 py-2 bg-success hover:bg-success/80 disabled:bg-surface-hover disabled:text-content-tertiary text-surface-primary rounded-lg transition-colors'
              >
                添加
              </button>
            </div>
          </div>
        )}

        {/* 修改密码表单 */}
        {showChangePasswordForm && (
          <div className='mb-4 p-4 bg-accent-muted rounded-lg border border-accent/20'>
            <h5 className='text-sm font-medium text-accent mb-3'>
              修改用户密码
            </h5>
            <div className='flex flex-col sm:flex-row gap-4 sm:gap-3'>
              <input
                type='text'
                placeholder='用户名'
                value={changePasswordUser.username}
                disabled
                className='flex-1 px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-hover text-content-primary cursor-not-allowed'
              />
              <input
                type='password'
                placeholder='新密码'
                value={changePasswordUser.password}
                onChange={(e) =>
                  setChangePasswordUser((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className='flex-1 px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent'
              />
              <button
                onClick={handleChangePassword}
                disabled={!changePasswordUser.password}
                className='w-full sm:w-auto px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-surface-hover disabled:text-content-tertiary text-surface-primary rounded-lg transition-colors'
              >
                修改密码
              </button>
              <button
                onClick={() => {
                  setShowChangePasswordForm(false);
                  setChangePasswordUser({ username: '', password: '' });
                }}
                className='w-full sm:w-auto px-4 py-2 bg-surface-hover hover:bg-stroke-secondary text-content-primary rounded-lg transition-colors'
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 用户列表 */}
        <div className='border border-stroke-primary rounded-lg max-h-[28rem] overflow-y-auto overflow-x-auto'>
          <table className='min-w-full divide-y divide-stroke-primary'>
            <thead className='bg-surface-tertiary'>
              <tr>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'
                >
                  用户名
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'
                >
                  角色
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'
                >
                  状态
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-right text-xs font-medium text-content-tertiary uppercase tracking-wider'
                >
                  操作
                </th>
              </tr>
            </thead>
            {/* 按规则排序用户：自己 -> 站长(若非自己) -> 管理员 -> 其他 */}
            {(() => {
              const sortedUsers = [...config.UserConfig.Users].sort((a, b) => {
                type UserInfo = (typeof config.UserConfig.Users)[number];
                const priority = (u: UserInfo) => {
                  if (u.username === currentUsername) return 0;
                  if (u.role === 'owner') return 1;
                  if (u.role === 'admin') return 2;
                  return 3;
                };
                return priority(a) - priority(b);
              });
              return (
                <tbody className='divide-y divide-stroke-primary'>
                  {sortedUsers.map((user) => {
                    // 修改密码权限：站长可修改管理员和普通用户密码，管理员可修改普通用户和自己的密码，但任何人都不能修改站长密码
                    const canChangePassword =
                      user.role !== 'owner' && // 不能修改站长密码
                      (role === 'owner' || // 站长可以修改管理员和普通用户密码
                        (role === 'admin' &&
                          (user.role === 'user' ||
                            user.username === currentUsername))); // 管理员可以修改普通用户和自己的密码

                    // 删除用户权限：站长可删除除自己外的所有用户，管理员仅可删除普通用户
                    const canDeleteUser =
                      user.username !== currentUsername &&
                      (role === 'owner' || // 站长可以删除除自己外的所有用户
                        (role === 'admin' && user.role === 'user')); // 管理员仅可删除普通用户

                    // 其他操作权限：不能操作自己，站长可操作所有用户，管理员可操作普通用户
                    const canOperate =
                      user.username !== currentUsername &&
                      (role === 'owner' ||
                        (role === 'admin' && user.role === 'user'));
                    return (
                      <tr
                        key={user.username}
                        className='hover:bg-surface-hover transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-content-primary'>
                          {user.username}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              user.role === 'owner'
                                ? 'bg-accent-muted text-accent'
                                : user.role === 'admin'
                                  ? 'bg-accent-muted text-accent'
                                  : 'bg-surface-hover text-content-secondary'
                            }`}
                          >
                            {user.role === 'owner'
                              ? '站长'
                              : user.role === 'admin'
                                ? '管理员'
                                : '普通用户'}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              !user.banned
                                ? 'bg-success/10 text-success'
                                : 'bg-error/10 text-error'
                            }`}
                          >
                            {!user.banned ? '正常' : '已封禁'}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                          {/* 修改密码按钮 */}
                          {canChangePassword && (
                            <button
                              onClick={() =>
                                handleShowChangePasswordForm(user.username)
                              }
                              className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-accent-muted text-accent hover:bg-accent/25 transition-colors'
                            >
                              修改密码
                            </button>
                          )}
                          {canOperate && (
                            <>
                              {/* 其他操作按钮 */}
                              {user.role === 'user' && (
                                <button
                                  onClick={() => handleSetAdmin(user.username)}
                                  className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-accent-muted text-accent hover:bg-accent/25 transition-colors'
                                >
                                  设为管理
                                </button>
                              )}
                              {user.role === 'admin' && (
                                <button
                                  onClick={() =>
                                    handleRemoveAdmin(user.username)
                                  }
                                  className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-surface-hover text-content-secondary hover:bg-stroke-secondary transition-colors'
                                >
                                  取消管理
                                </button>
                              )}
                              {user.role !== 'owner' &&
                                (!user.banned ? (
                                  <button
                                    onClick={() => handleBanUser(user.username)}
                                    className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-error/10 text-error hover:bg-error/20 transition-colors'
                                  >
                                    封禁
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleUnbanUser(user.username)
                                    }
                                    className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors'
                                  >
                                    解封
                                  </button>
                                ))}
                            </>
                          )}
                          {/* 删除用户按钮 - 放在最后，使用更明显的红色样式 */}
                          {canDeleteUser && (
                            <button
                              onClick={() => handleDeleteUser(user.username)}
                              className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-error text-white hover:bg-error/80 transition-colors'
                            >
                              删除用户
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })()}
          </table>
        </div>
      </div>
    </div>
  );
};

// 视频源配置组件
const VideoSourceConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const { confirm: showConfirm, alert: showAlert } = useConfirmDialog();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [newSource, setNewSource] = useState<DataSource>({
    name: '',
    key: '',
    api: '',
    detail: '',
    disabled: false,
    from: 'config',
    is_adult: false, // 默认不是成人内容
  });

  // dnd-kit 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 轻微位移即可触发
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 长按 150ms 后触发，避免与滚动冲突
        tolerance: 5,
      },
    }),
  );

  // 初始化
  useEffect(() => {
    if (config?.SourceConfig) {
      setSources(config.SourceConfig);
      // 进入时重置 orderChanged
      setOrderChanged(false);
    }
  }, [config]);

  // 通用 API 请求
  const callSourceApi = async (body: SourceActionPayload) => {
    try {
      const resp = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `操作失败: ${resp.status}`);
      }

      // 成功后刷新配置
      await refreshConfig();
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
      throw err; // 向上抛出方便调用处判断
    }
  };

  const handleToggleEnable = (key: string) => {
    const target = sources.find((s) => s.key === key);
    if (!target) return;
    const action = target.disabled ? 'enable' : 'disable';
    callSourceApi({ action, key }).catch(() => {
      console.error('操作失败', action, key);
    });
  };

  const handleSetAdult = (key: string, isAdult: boolean) => {
    // 乐观更新 UI（失败时回滚）
    const before = sources;
    setSources((prev) =>
      prev.map((s) => (s.key === key ? { ...s, is_adult: isAdult } : s)),
    );

    callSourceApi({ action: 'update', key, is_adult: isAdult }).catch(() => {
      console.error('操作失败', 'update', key, isAdult);
      setSources(before);
    });
  };

  const handleDelete = (key: string) => {
    // 检查是否为示例源
    const source = sources.find((s) => s.key === key);
    if (source?.from === 'config') {
      showError('示例源不可删除，这些源用于演示功能');
      return;
    }

    callSourceApi({ action: 'delete', key }).catch(() => {
      console.error('操作失败', 'delete', key);
    });
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.key || !newSource.api) return;
    callSourceApi({
      action: 'add',
      key: newSource.key,
      name: newSource.name,
      api: newSource.api,
      detail: newSource.detail,
      is_adult: newSource.is_adult, // 传递成人内容标记
    })
      .then(() => {
        setNewSource({
          name: '',
          key: '',
          api: '',
          detail: '',
          disabled: false,
          from: 'custom',
          is_adult: false, // 重置为默认值
        });
        setShowAddForm(false);
      })
      .catch(() => {
        console.error('操作失败', 'add', newSource);
      });
  };

  // 批量操作相关函数
  const handleToggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedSources(new Set()); // 切换模式时清空选择
  };

  const handleSelectSource = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedSources);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedSources(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 只选择可删除的视频源（排除示例源）
      const deletableSources = sources.filter(
        (source) => source.from !== 'config',
      );
      setSelectedSources(new Set(deletableSources.map((source) => source.key)));
    } else {
      setSelectedSources(new Set());
    }
  };

  const handleBatchDelete = async () => {
    if (selectedSources.size === 0) {
      showError('请先选择要删除的视频源');
      return;
    }

    const selectedArray = Array.from(selectedSources);
    const isConfirmed = await showConfirm({
      title: '确认批量删除',
      message: `即将删除 ${selectedArray.length} 个视频源，此操作不可撤销！`,
      type: 'warning',
      confirmText: '确认删除',
      cancelText: '取消',
    });

    if (!isConfirmed) return;

    // 批量删除逐个进行
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const toastId = toast.loading(`正在删除 0/${selectedArray.length}...`);

    for (let i = 0; i < selectedArray.length; i++) {
      const key = selectedArray[i];
      try {
        await callSourceApi({ action: 'delete', key });
        successCount++;
        toast.loading(`正在删除 ${i + 1}/${selectedArray.length}...`, {
          id: toastId,
        });
      } catch (error) {
        errorCount++;
        const sourceName = sources.find((s) => s.key === key)?.name || key;
        errors.push(
          `${sourceName}: ${
            error instanceof Error ? error.message : '删除失败'
          }`,
        );
      }
    }

    // 显示删除结果
    if (errorCount === 0) {
      toast.success(`成功删除 ${successCount} 个视频源`, { id: toastId });
      setSelectedSources(new Set());
      setBatchMode(false);
    } else {
      toast.error(`删除完成：成功 ${successCount} 个，失败 ${errorCount} 个`, {
        id: toastId,
      });
      // 清空已成功删除的选择项
      const failedKeys = new Set(
        errors
          .map((err) => {
            const keyMatch = err.split(':')[0];
            return sources.find((s) => s.name === keyMatch)?.key;
          })
          .filter((key): key is string => Boolean(key)),
      );
      setSelectedSources(failedKeys);
    }

    await refreshConfig();
  };

  // 导出配置
  const handleExportConfig = () => {
    try {
      // 构建符合要求的配置格式
      const exportConfig: ConfigExportFile = {
        cache_time: config?.SiteConfig?.SiteInterfaceCacheTime || 7200,
        api_site: {},
      };

      // 将视频源转换为config.json格式
      sources.forEach((source) => {
        if (!source.disabled) {
          exportConfig.api_site[source.key] = {
            api: source.api,
            name: source.name,
            ...(source.detail && { detail: source.detail }),
            ...(source.is_adult !== undefined && { is_adult: source.is_adult }), // 确保导出 is_adult 字段
          };
        }
      });

      // 生成JSON文件并下载
      const dataStr = JSON.stringify(exportConfig, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `config_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('配置文件已导出到下载文件夹');
    } catch (error) {
      showError(
        '导出失败: ' + (error instanceof Error ? error.message : '未知错误'),
      );
    }
  };

  // 处理导入文件（供点击和拖拽共用）
  const processImportFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      showError('请选择JSON文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importConfig = JSON.parse(content) as ConfigImportFile;

        // 验证配置格式
        if (
          !importConfig.api_site ||
          typeof importConfig.api_site !== 'object'
        ) {
          showError('配置文件格式错误：缺少 api_site 字段');
          return;
        }

        // 确认导入
        const isConfirmed = await showConfirm({
          title: '确认导入',
          message: `检测到 ${
            Object.keys(importConfig.api_site).length
          } 个视频源，是否继续导入？`,
          type: 'info',
          confirmText: '确认导入',
          cancelText: '取消',
        });

        if (!isConfirmed) return;

        // 批量导入视频源
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const [key, source] of Object.entries(importConfig.api_site)) {
          try {
            // 类型检查和验证
            if (
              !source ||
              typeof source !== 'object' ||
              Array.isArray(source)
            ) {
              throw new Error(`${key}: 无效的配置对象`);
            }

            const sourceObj = source as Partial<ConfigFileEntry>;

            if (!sourceObj.api || !sourceObj.name) {
              throw new Error(`${key}: 缺少必要字段 api 或 name`);
            }

            await callSourceApi({
              action: 'add',
              key: key,
              name: sourceObj.name,
              api: sourceObj.api,
              detail: sourceObj.detail || '',
              is_adult: sourceObj.is_adult || false, // 确保处理 is_adult 字段
            });
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(
              `${key}: ${error instanceof Error ? error.message : '未知错误'}`,
            );
          }
        }

        // 显示导入结果
        if (errorCount === 0) {
          showSuccess(`成功导入 ${successCount} 个视频源`);
        } else {
          await showAlert({
            title: '导入完成',
            message: (
              <div className='text-left'>
                <p className='text-success mb-2'>
                  成功导入: {successCount} 个
                </p>
                <p className='text-error mb-2'>
                  导入失败: {errorCount} 个
                </p>
                {errors.length > 0 && (
                  <details className='mt-3'>
                    <summary className='cursor-pointer text-content-tertiary'>
                      查看错误详情
                    </summary>
                    <div className='mt-2 text-sm text-content-tertiary max-h-32 overflow-y-auto'>
                      {errors.map((err, i) => (
                        <div key={i} className='py-1'>
                          {err}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ),
            type: successCount > 0 ? 'warning' : 'error',
          });
        }
      } catch (error) {
        showError(
          '配置文件解析失败: ' +
            (error instanceof Error ? error.message : '文件格式错误'),
        );
      }
    };

    reader.onerror = () => {
      showError('文件读取失败');
    };

    reader.readAsText(file);
  };

  // 点击导入
  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processImportFile(file);
    event.target.value = '';
  };

  // 拖拽导入状态
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImportFile(file);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sources.findIndex((s) => s.key === active.id);
    const newIndex = sources.findIndex((s) => s.key === over.id);
    setSources((prev) => arrayMove(prev, oldIndex, newIndex));
    setOrderChanged(true);
  };

  const handleSaveOrder = () => {
    const order = sources.map((s) => s.key);
    callSourceApi({ action: 'sort', order })
      .then(() => {
        setOrderChanged(false);
      })
      .catch(() => {
        console.error('操作失败', 'sort', order);
      });
  };

  // 可拖拽行封装 (dnd-kit)
  const DraggableRow = ({ source }: { source: DataSource }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: source.key });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties;

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className='hover:bg-surface-hover transition-colors select-none'
      >
        {/* 拖拽手柄 */}
        <td
          className='px-2 py-4 cursor-grab text-content-secondary'
          style={{ touchAction: 'none' }}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </td>

        {/* 批量选择复选框 */}
        {batchMode && (
          <td className='px-4 py-4 whitespace-nowrap'>
            <input
              type='checkbox'
              checked={selectedSources.has(source.key)}
              onChange={(e) => handleSelectSource(source.key, e.target.checked)}
              disabled={source.from === 'config'} // 禁用示例源选择
              className='w-4 h-4 text-accent bg-surface-tertiary border-stroke-secondary rounded focus:ring-accent/40 disabled:opacity-50'
            />
          </td>
        )}
        <td className='px-6 py-4 whitespace-nowrap text-sm text-content-primary'>
          <div className='flex items-center space-x-2'>
            <span>{source.name}</span>
            {source.from === 'config' && (
              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-muted text-accent'>
                示例源
              </span>
            )}
          </div>
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-sm text-content-primary'>
          {source.key}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-content-primary max-w-[12rem] truncate'
          title={source.api}
        >
          {source.api}
        </td>
        <td
          className='px-6 py-4 whitespace-nowrap text-sm text-content-primary max-w-[8rem] truncate'
          title={source.detail || '-'}
        >
          {source.detail || '-'}
        </td>
        <td className='px-6 py-4 whitespace-nowrap'>
          <label className='inline-flex items-center gap-2'>
            <input
              type='checkbox'
              checked={source.is_adult === true}
              onChange={(e) => handleSetAdult(source.key, e.target.checked)}
              className='w-4 h-4 text-error bg-surface-tertiary border-stroke-secondary rounded focus:ring-error/40'
            />
            <span className='text-xs text-content-secondary'>
              {source.is_adult === true ? '🔞' : '—'}
            </span>
          </label>
        </td>
        <td className='px-6 py-4 whitespace-nowrap max-w-[1rem]'>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              !source.disabled
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
            }`}
          >
            {!source.disabled ? '启用中' : '已禁用'}
          </span>
        </td>
        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
          <button
            onClick={() => handleToggleEnable(source.key)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
              !source.disabled
                ? 'bg-error/10 text-error hover:bg-error/20'
                : 'bg-success/10 text-success hover:bg-success/20'
            } transition-colors`}
          >
            {!source.disabled ? '禁用' : '启用'}
          </button>
          {source.from !== 'config' ? (
            <button
              onClick={() => handleDelete(source.key)}
              className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-surface-hover text-content-secondary hover:bg-stroke-secondary transition-colors'
            >
              删除
            </button>
          ) : (
            <span className='inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-surface-hover text-content-tertiary'>
              不可删除
            </span>
          )}
        </td>
      </tr>
    );
  };

  if (!config) {
    return (
      <div className='text-center text-content-secondary'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 视频源管理工具栏 */}
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <h4 className='text-sm font-medium text-content-secondary'>
          视频源列表
        </h4>

        <div className='flex items-center gap-2 flex-wrap'>
          {/* 批量操作区域 */}
          {!batchMode ? (
            <>
              {/* 普通模式按钮 */}
              <button
                onClick={handleToggleBatchMode}
                className='inline-flex items-center px-3 py-1 bg-accent hover:bg-accent-hover text-surface-primary text-sm rounded-lg transition-colors'
              >
                <CheckSquare className='w-4 h-4 mr-1 inline' /> 批量选择
              </button>

              {/* 导入导出按钮 */}
              <div className='flex items-center gap-1 border-l border-stroke-secondary pl-2'>
                <label className='relative'>
                  <input
                    type='file'
                    accept='.json'
                    onChange={handleImportConfig}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                  />
                  <span className='inline-flex items-center px-3 py-1 bg-accent hover:bg-accent-hover text-surface-primary text-sm rounded-lg transition-colors cursor-pointer'>
                    <FolderOpen className='w-4 h-4 mr-1 inline' /> 导入
                  </span>
                </label>

                <button
                  onClick={handleExportConfig}
                  className='inline-flex items-center px-3 py-1 bg-success hover:bg-success/80 text-surface-primary text-sm rounded-lg transition-colors'
                >
                  <Download className='w-4 h-4 mr-1 inline' /> 导出
                </button>
              </div>

              {/* 添加视频源按钮 */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className='px-3 py-1 bg-accent hover:bg-accent-hover text-surface-primary text-sm rounded-lg transition-colors'
              >
                {showAddForm ? <><X className='w-4 h-4 mr-1 inline' /> 取消</> : <><Plus className='w-4 h-4 mr-1 inline' /> 添加</>}
              </button>
            </>
          ) : (
            <>
              {/* 批量模式按钮 */}
              <button
                onClick={handleToggleBatchMode}
                className='inline-flex items-center px-3 py-1 bg-surface-hover hover:bg-stroke-secondary text-content-primary text-sm rounded-lg transition-colors'
              >
                <X className='w-4 h-4 mr-1 inline' /> 退出批量
              </button>

              <div className='flex items-center gap-1 border-l border-stroke-secondary pl-2'>
                <span className='text-xs text-content-tertiary'>
                  已选 {selectedSources.size} 个
                </span>

                <button
                  onClick={handleBatchDelete}
                  disabled={selectedSources.size === 0}
                  className='inline-flex items-center px-3 py-1 bg-error hover:bg-error/80 disabled:bg-surface-hover disabled:text-content-tertiary text-white text-sm rounded-lg transition-colors'
                >
                  <Trash2 className='w-4 h-4 mr-1 inline' /> 批量删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 拖拽导入区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropFile}
        className={`mb-4 border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 cursor-pointer ${
          isDragOver
            ? 'border-accent bg-accent-muted text-accent'
            : 'border-stroke-secondary text-content-tertiary hover:border-stroke-primary hover:text-content-secondary'
        }`}
        onClick={() => document.getElementById('dropzone-file-input')?.click()}
      >
        <input
          id='dropzone-file-input'
          type='file'
          accept='.json'
          onChange={handleImportConfig}
          className='hidden'
        />
        <p className='text-sm'>
          {isDragOver ? '松开即可导入' : '拖拽 JSON 文件到此处导入视频源，或点击选择文件'}
        </p>
      </div>

      {showAddForm && (
        <div className='p-4 bg-surface-tertiary rounded-lg border border-stroke-primary space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <input
              type='text'
              placeholder='名称'
              value={newSource.name}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, name: e.target.value }))
              }
              className='px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary'
            />
            <input
              type='text'
              placeholder='Key'
              value={newSource.key}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, key: e.target.value }))
              }
              className='px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary'
            />
            <input
              type='text'
              placeholder='API 地址'
              value={newSource.api}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, api: e.target.value }))
              }
              className='px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary'
            />
            <input
              type='text'
              placeholder='Detail 地址（选填）'
              value={newSource.detail}
              onChange={(e) =>
                setNewSource((prev) => ({ ...prev, detail: e.target.value }))
              }
              className='px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary'
            />

            {/* 成人内容标记复选框 */}
            <div className='flex items-center space-x-2'>
              <input
                type='checkbox'
                id='is_adult'
                checked={newSource.is_adult || false}
                onChange={(e) =>
                  setNewSource((prev) => ({
                    ...prev,
                    is_adult: e.target.checked,
                  }))
                }
                className='w-4 h-4 text-error bg-surface-tertiary border-stroke-secondary rounded focus:ring-error/40'
              />
              <label
                htmlFor='is_adult'
                className='text-sm font-medium text-content-primary'
              >
                🔞 成人内容资源站
              </label>
            </div>
          </div>
          <div className='flex justify-end'>
            <button
              onClick={handleAddSource}
              disabled={!newSource.name || !newSource.key || !newSource.api}
              className='w-full sm:w-auto px-4 py-2 bg-success hover:bg-success/80 disabled:bg-surface-hover disabled:text-content-tertiary text-surface-primary rounded-lg transition-colors'
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* 视频源表格 */}
      <div className='border border-stroke-primary rounded-lg max-h-[28rem] overflow-y-auto overflow-x-auto'>
        <table className='min-w-full divide-y divide-stroke-primary'>
          <thead className='bg-surface-tertiary'>
            <tr>
              {/* 拖拽手柄列 */}
              <th className='w-8' />

              {/* 批量选择列 */}
              {batchMode && (
                <th className='w-12 px-4 py-3'>
                  <input
                    type='checkbox'
                    checked={
                      selectedSources.size > 0 &&
                      selectedSources.size === sources.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className='w-4 h-4 text-accent bg-surface-tertiary border-stroke-secondary rounded focus:ring-accent/40'
                  />
                </th>
              )}

              <th className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'>
                名称
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'>
                Key
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'>
                API 地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'>
                Detail 地址
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'>
                成人
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider'>
                状态
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-content-tertiary uppercase tracking-wider'>
                操作
              </th>
            </tr>
          </thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            autoScroll={false}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={sources.map((s) => s.key)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className='divide-y divide-stroke-primary'>
                {sources.map((source) => (
                  <DraggableRow key={source.key} source={source} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {/* 保存排序按钮 */}
      {orderChanged && (
        <div className='flex justify-end'>
          <button
            onClick={handleSaveOrder}
            className='px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-surface-primary rounded-lg transition-colors'
          >
            保存排序
          </button>
        </div>
      )}
    </div>
  );
};

// 新增站点配置组件
const SiteConfigComponent = ({ config }: { config: AdminConfig | null }) => {
  const [siteSettings, setSiteSettings] = useState<SiteConfig>({
    SiteName: '',
    Announcement: '',
    SearchDownstreamMaxPage: 1,
    SiteInterfaceCacheTime: 7200,
    ImageProxy: '',
    DoubanProxy: '',
  });
  // 保存状态
  const [saving, setSaving] = useState(false);

  // 检测存储类型是否为 d1 或 upstash
  const runtimeStorageType = getRuntimeStorageType();
  const isD1Storage = runtimeStorageType === 'd1';
  const isUpstashStorage = runtimeStorageType === 'upstash';

  useEffect(() => {
    if (config?.SiteConfig) {
      setSiteSettings({
        ...config.SiteConfig,
        ImageProxy: config.SiteConfig.ImageProxy || '',
        DoubanProxy: config.SiteConfig.DoubanProxy || '',
      });
    }
  }, [config]);

  // 保存站点配置
  const handleSave = async () => {
    try {
      setSaving(true);
      const resp = await fetch('/api/admin/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...siteSettings }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `保存失败: ${resp.status}`);
      }

      showSuccess('保存成功, 请刷新页面');
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className='text-center text-content-secondary'>
        加载中...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 站点名称 */}
      <div>
        <label
          className={`block text-sm font-medium text-content-secondary mb-2 ${
            isD1Storage || isUpstashStorage ? 'opacity-50' : ''
          }`}
        >
          站点名称
          {isD1Storage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (D1 环境下请通过环境变量修改)
            </span>
          )}
          {isUpstashStorage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (Upstash 环境下请通过环境变量修改)
            </span>
          )}
        </label>
        <input
          type='text'
          value={siteSettings.SiteName}
          onChange={(e) =>
            !isD1Storage &&
            !isUpstashStorage &&
            setSiteSettings((prev) => ({ ...prev, SiteName: e.target.value }))
          }
          disabled={isD1Storage || isUpstashStorage}
          className={`w-full px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-elevated text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent ${
            isD1Storage || isUpstashStorage
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        />
      </div>

      {/* 站点公告 */}
      <div>
        <label
          className={`block text-sm font-medium text-content-secondary mb-2 ${
            isD1Storage || isUpstashStorage ? 'opacity-50' : ''
          }`}
        >
          站点公告
          {isD1Storage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (D1 环境下请通过环境变量修改)
            </span>
          )}
          {isUpstashStorage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (Upstash 环境下请通过环境变量修改)
            </span>
          )}
        </label>
        <textarea
          value={siteSettings.Announcement}
          onChange={(e) =>
            !isD1Storage &&
            !isUpstashStorage &&
            setSiteSettings((prev) => ({
              ...prev,
              Announcement: e.target.value,
            }))
          }
          disabled={isD1Storage || isUpstashStorage}
          rows={3}
          className={`w-full px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-tertiary text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent ${
            isD1Storage || isUpstashStorage
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        />
      </div>

      {/* 搜索接口可拉取最大页数 */}
      <div>
        <label className='block text-sm font-medium text-content-secondary mb-2'>
          搜索接口可拉取最大页数
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SearchDownstreamMaxPage}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SearchDownstreamMaxPage: Number(e.target.value),
            }))
          }
          className='w-full px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-tertiary text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent'
        />
      </div>

      {/* 站点接口缓存时间 */}
      <div>
        <label className='block text-sm font-medium text-content-secondary mb-2'>
          站点接口缓存时间（秒）
        </label>
        <input
          type='number'
          min={1}
          value={siteSettings.SiteInterfaceCacheTime}
          onChange={(e) =>
            setSiteSettings((prev) => ({
              ...prev,
              SiteInterfaceCacheTime: Number(e.target.value),
            }))
          }
          className='w-full px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-tertiary text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent'
        />
      </div>

      {/* 图片代理 */}
      <div>
        <label
          className={`block text-sm font-medium text-content-secondary mb-2 ${
            isD1Storage || isUpstashStorage ? 'opacity-50' : ''
          }`}
        >
          图片代理前缀
          {isD1Storage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (D1 环境下请通过环境变量修改)
            </span>
          )}
          {isUpstashStorage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (Upstash 环境下请通过环境变量修改)
            </span>
          )}
        </label>
        <input
          type='text'
          placeholder='例如: https://imageproxy.example.com/?url='
          value={siteSettings.ImageProxy}
          onChange={(e) =>
            !isD1Storage &&
            !isUpstashStorage &&
            setSiteSettings((prev) => ({
              ...prev,
              ImageProxy: e.target.value,
            }))
          }
          disabled={isD1Storage || isUpstashStorage}
          className={`w-full px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-tertiary text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent ${
            isD1Storage || isUpstashStorage
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        />
        <p className='mt-1 text-xs text-content-tertiary'>
          用于代理图片访问，解决跨域或访问限制问题。留空则不使用代理。
        </p>
      </div>

      {/* 豆瓣代理设置 */}
      <div>
        <label
          className={`block text-sm font-medium text-content-secondary mb-2 ${
            isD1Storage || isUpstashStorage ? 'opacity-50' : ''
          }`}
        >
          豆瓣代理地址
          {isD1Storage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (D1 环境下请通过环境变量修改)
            </span>
          )}
          {isUpstashStorage && (
            <span className='ml-2 text-xs text-content-tertiary'>
              (Upstash 环境下请通过环境变量修改)
            </span>
          )}
        </label>
        <input
          type='text'
          placeholder='例如: https://proxy.example.com/fetch?url='
          value={siteSettings.DoubanProxy}
          onChange={(e) =>
            !isD1Storage &&
            !isUpstashStorage &&
            setSiteSettings((prev) => ({
              ...prev,
              DoubanProxy: e.target.value,
            }))
          }
          disabled={isD1Storage || isUpstashStorage}
          className={`w-full px-3 py-2 border border-stroke-secondary rounded-lg bg-surface-tertiary text-content-primary focus:ring-2 focus:ring-accent/40 focus:border-transparent ${
            isD1Storage || isUpstashStorage
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        />
        <p className='mt-1 text-xs text-content-tertiary'>
          用于代理豆瓣数据访问，解决跨域或访问限制问题。留空则使用服务端API。
        </p>
      </div>

      {/* 操作按钮 */}
      <div className='flex justify-end'>
        <button
          onClick={handleSave}
          disabled={saving || isD1Storage || isUpstashStorage}
          className={`px-4 py-2 ${
            saving || isD1Storage || isUpstashStorage
              ? 'bg-surface-hover cursor-not-allowed text-content-tertiary'
              : 'bg-success hover:bg-success/80'
          } text-white rounded-lg transition-colors`}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
};

function AdminPageClient() {
  const router = useRouter();
  const { confirm: showConfirm } = useConfirmDialog();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<{ [key: string]: boolean }>({
    userConfig: false,
    videoSource: false,
    siteConfig: false,
  });

  // 获取管理员配置
  // showLoading 用于控制是否在请求期间显示整体加载骨架。
  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch(`/api/admin/config`);
      const payload = await response.json();

      if (!response.ok) {
        const errorPayload = payload as { error?: string };
        throw new Error(
          `获取配置失败: ${errorPayload.error || response.statusText}`,
        );
      }

      const data = payload as AdminConfigResult;
      setConfig(data.Config);
      setRole(data.Role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取配置失败';
      showError(msg);
      setError(msg);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // 首次加载时显示骨架
    fetchConfig(true);
  }, [fetchConfig]);

  // 切换标签展开状态
  const toggleTab = (tabKey: string) => {
    setExpandedTabs((prev) => ({
      ...prev,
      [tabKey]: !prev[tabKey],
    }));
  };

  // 新增: 重置配置处理函数
  const handleResetConfig = async () => {
    const isConfirmed = await showConfirm({
      title: '确认重置配置',
      message:
        '此操作将重置用户封禁和管理员设置、自定义视频源，站点配置将重置为默认值，是否继续？',
      type: 'warning',
      confirmText: '确认',
      cancelText: '取消',
    });
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/admin/reset`);
      if (!response.ok) {
        throw new Error(`重置失败: ${response.status}`);
      }
      showSuccess('重置成功，请刷新页面！');
    } catch (err) {
      showError(err instanceof Error ? err.message : '重置失败');
    }
  };

  if (loading) {
    return (
      <PageLayout activePath='/admin'>
        <div className='px-2 sm:px-10 py-4 sm:py-8'>
          <div className='max-w-[95%] mx-auto'>
            <h1 className='text-2xl font-bold text-content-primary mb-8'>
              管理员设置
            </h1>
            <div className='space-y-4'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className='h-20 bg-surface-tertiary rounded-lg animate-pulse'
                />
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    // 错误已通过 toast 展示，此处直接返回空
    return null;
  }

  return (
    <PageLayout activePath='/admin'>
      <div className='px-2 sm:px-10 py-4 sm:py-8'>
        <div className='max-w-[95%] mx-auto'>
          {/* 标题 + 重置配置按钮 */}
          <div className='flex items-center gap-2 mb-8'>
            <h1 className='text-2xl font-bold text-content-primary'>
              管理员设置
            </h1>
            {config && role === 'owner' && (
              <button
                onClick={handleResetConfig}
                className='px-3 py-1 bg-error hover:bg-error/80 text-white text-xs rounded-md transition-colors'
              >
                重置配置
              </button>
            )}
            <button
              onClick={() => router.push('/config')}
              className='px-3 py-1 bg-accent hover:bg-accent-hover text-surface-primary text-xs rounded-md transition-colors flex items-center gap-1'
            >
              <Tv size={14} />
              <span>TVBox 配置</span>
            </button>
          </div>

          {/* 站点配置标签 */}
          <CollapsibleTab
            title='站点配置'
            icon={
              <Settings
                size={20}
                className='text-content-tertiary'
              />
            }
            isExpanded={expandedTabs.siteConfig}
            onToggle={() => toggleTab('siteConfig')}
          >
            <SiteConfigComponent config={config} />
          </CollapsibleTab>

          <div className='space-y-4'>
            {/* 用户配置标签 */}
            <CollapsibleTab
              title='用户配置'
              icon={
                <Users size={20} className='text-content-tertiary' />
              }
              isExpanded={expandedTabs.userConfig}
              onToggle={() => toggleTab('userConfig')}
            >
              <UserConfig
                config={config}
                role={role}
                refreshConfig={fetchConfig}
              />
            </CollapsibleTab>

            {/* 视频源配置标签 */}
            <CollapsibleTab
              title='视频源配置'
              icon={
                <Video size={20} className='text-content-tertiary' />
              }
              isExpanded={expandedTabs.videoSource}
              onToggle={() => toggleTab('videoSource')}
            >
              <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
            </CollapsibleTab>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageClient />
    </Suspense>
  );
}
