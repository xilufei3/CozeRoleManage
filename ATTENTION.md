### 前端注意事项

#### UI 组件样式覆盖问题

**问题**: Semi Design 的 Tag 组件即使不设置 color 属性，也会有默认的蓝色背景
**原因**: Tag 组件的默认样式就是带背景色的
**解决**:
- 方案1: 使用 `type="ghost"` 属性（透明背景+边框）
- 方案2: 直接用原生 HTML 元素 + Tailwind CSS（更可控）

```typescript
// ❌ 错误：不设置 color 仍然有蓝色背景
<Tag>{action}</Tag>

// ✅ 方案1：使用 ghost 类型
<Tag type="ghost">{action}</Tag>

// ✅ 方案2：使用原生元素（推荐，完全可控）
<span className="inline-block px-2 py-1 text-sm bg-white border border-gray-300 rounded">
  {action}
</span>
```

**经验**: 当 UI 组件库的默认样式不符合需求时，使用原生 HTML + CSS 更灵活

#### HTTP 客户端修复

**问题**: 使用了不存在的 `@coze-arch/web-request`
**解决**: 改用项目中正确的 `@coze-arch/bot-http` 中的 `axiosInstance`
**修改文件**: `frontend/apps/coze-studio/src/api/rbac.ts`

```typescript
// 之前 (错误)
import { request } from '@coze-arch/web-request';
// 现在 (正确)
import { axiosInstance } from '@coze-arch/bot-http';
并且所有的 request.xxx 改为 axiosInstance.xxx，所有的 res.data 改为 res.data.data (因为响应格式不同)
```

#### 每次运行使用node22的版本，不然会运行失败

#### axios 拦截器已经解包了响应，所以 res 本身就是数据，而不是 res.data。

修复代码：在 rbac.ts 的 getSpaceResources 函数中检查 `'resource_list' in res`，如果存在则直接返回 res。

#### 资源类型 ID 的来源

RBAC 中的资源类型 ID (4, 5, 6, 7, 17, 23) **不是随便定义的**，它们来自：
- `/backend/domain/permission/consts.go` - 项目全局资源类型定义
- 这是整个项目统一的资源编号标准
- **不建议修改**，因为其他模块也依赖这些数字

#### Agent 资源的特殊性

**问题**: `library_resource_list` API 不支持 Agent 资源类型
**原因**: 该 API 只支持 Plugin(1)、Workflow(2)、Knowledge(4)、Prompt(6)、Database(7)
**解决**: 为 Agent 创建专用 API `/api/rbac/resources/agents`
**数据源**: 直接查询 `single_agent_draft` 表

**关键代码**:
```go
// backend/domain/rbac/service/rbac_impl.go
s.db.WithContext(ctx).
    Table("single_agent_draft").
    Select("id, agent_id, name, description").
    Where("space_id = ? AND deleted_at IS NULL", spaceID).
    Find(&agents)
```

**注意**: 使用 `agent_id` 字段作为资源 ID，而不是表的主键 `id`

#### 权限继承机制的实现

**设计原则**: 具体资源的有效权限 = 所有资源权限 ∪ 具体资源权限（并集）

**场景示例**:
- 对"所有 Agent"有 `read`, `execute` 权限
- 对"Agent-123"有 `create` 权限
- 则对"Agent-123"实际有: `read`, `execute`, `create` 权限

**实现位置**:
1. 后端聚合: `backend/domain/rbac/service/rbac_impl.go` - `GetUserPermissions`
2. 前端角色配置: 继承的权限显示"(继承)"并禁用修改
3. 前端用户查看: 自动合并显示所有权限

#### React useEffect 依赖数组的陷阱

**问题**: 在 useEffect 的依赖数组中添加 state 可能导致无限循环
**场景**:
```typescript
// ❌ 错误：会导致循环
useEffect(() => {
  loadData();
  setPermissions(data); // 这会触发重新渲染
}, [permissions]); // permissions 变化又触发 useEffect

// ✅ 正确：分离加载和初始化
useEffect(() => {
  if (visible && spaceId) {
    loadAllResources();
  }
}, [visible, spaceId]); // 只依赖外部状态

// 使用单独的 useEffect 处理数据初始化
useEffect(() => {
  if (visible && resourceLists && !isInitialized) {
    initializeSelectedResources();
    setIsInitialized(true);
  }
}, [visible, resourceLists, isInitialized]);
```

####
 移除了可能有问题的 Collapse 组件
✅ 使用 Tabs 分类展示接口（角色管理、用户角色分配、权限管理、权限检查）

#### 如果 `IconCozSetting` 不存在，可以使用以下替代图标：

```typescript
// 选项 1: 使用齿轮图标
import { IconCozGear, IconCozGearFill } from '@coze-arch/coze-design/icons';
// 选项 2: 使用工具图标
import { IconCozTool, IconCozToolFill } from '@coze-arch/coze-design/icons';
// 选项 3: 使用管理图标
import { IconCozManage, IconCozManageFill } from '@coze-arch/coze-design/icons';
```

#### 确认`package.json` 存在且包含所有需要的依赖和包

#### 每个react的组件的最大代码量不过超过150行，如果超过了要划分成小的组件

#### 不同的组件应该分别导入不同的api，而不是批量导入

错误示范：
import { rbacApi } from '@/api/rbac';

#### @coze-arch/coze-design 组件导入规范

**问题**: React 页面崩溃，控制台报错 "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined"

**原因**: `Text` 组件不能直接从 `@coze-arch/coze-design` 导入，它是 `Typography` 的子组件

**错误示范**:
```typescript
// ❌ 错误：导致页面崩溃
import { Modal, Text, Card, Tag } from '@coze-arch/coze-design';
```

**正确示范**:
```typescript
// ✅ 正确：Text 需要从 Typography 中解构
import { Modal, Card, Tag, Typography } from '@coze-arch/coze-design';

const { Text, Title } = Typography;
```

**适用组件**:
- `Text` - 必须从 `Typography` 解构
- `Title` - 必须从 `Typography` 解构
- `Paragraph` - 必须从 `Typography` 解构

**影响文件示例**:
- `frontend/apps/coze-studio/src/pages/system/components/UserPermissionDetailModal.tsx`
- `frontend/apps/coze-studio/src/pages/system/components/PermissionConfigModal.tsx`
- 其他使用 `Text` 组件的文件

**调试提示**: 如果页面显示错误页面，检查浏览器控制台是否有 "Element type is invalid" 错误，通常是组件导入问题

#### Modal 组件的 footer 属性使用

**问题**: Modal 的 footer 属性使用 JSX 数组时可能导致错误

**错误示范**:
```typescript
// ❌ 可能导致错误
<Modal
  footer={[
    <Button key="close" onClick={onClose}>
      关闭
    </Button>,
  ]}
/>
```

**正确示范**:
```typescript
// ✅ 方案1: 使用标准的 onOk/okText
<Modal
  onOk={onClose}
  onCancel={onClose}
  okText="关闭"
  cancelText=""
/>

// ✅ 方案2: footer 设为 null（无按钮）
<Modal
  footer={null}
  onCancel={onClose}
/>
```

这是一起典型的多重配置冲突导致的故障：

#### 路由前缀冲突（核心原因）: 开发服务器配置了代理规则 proxy: { '/api': 'http://localhost:8888' }。当访问 /api-docs 时，请求错误地匹配到了代理规则，被转发至后端，后端返回 404 HTML 页面，导致前端 JS 解析失败（< 错误）。

路由嵌套干扰: 目标页面最初被嵌套在主应用的 Layout 组件下。Layout 组件可能包含强制重定向或鉴权逻辑，导致未登录状态下页面无法正常渲染。
HMR 配置不当: 开发服务器的 HMR（热更新）客户端尝试连接默认的 localhost:8080，而实际服务运行在 3000 端口且通过局域网 IP 访问，导致 HMR 连接失败。

解决方案
修改路由路径（避开冲突）: 将前端路由从 /api-docs 修改为 /dev-interface，彻底避开 /api 代理前缀。
提升路由层级: 将该路由移出主 Layout，配置为顶级路由，确保其独立渲染不受干扰。

修正开发服务器配置:
设置 server.historyApiFallback.disableDotRule: true，防止静态资源请求错误返回 index.html。
显式配置 dev.client 的 host 和 port，确保 HMR 在局域网环境下正常工作。
经验教训
前端路由命名需谨慎: 千万不要以 /api 开头，除非你真的想让它走后端代理。

### 后端注意事项

#### JSON 数组序列化

**问题**: `[]string` 类型无法直接存入 MySQL JSON 字段
**解决**: 实现自定义 `StringArray` 类型 + `driver.Valuer` + `sql.Scanner` 接口

```go
type StringArray []string

func (s StringArray) Value() (driver.Value, error) {
    b, err := json.Marshal(s)
    return string(b), err
}

func (s *StringArray) Scan(value interface{}) error {
    return json.Unmarshal(bytes, s)
}
```

#### GORM Delete 操作 panic

**问题**: `UseTable` 导致 `reflect.New(nil)` 错误
**解决**: 使用原生 GORM SQL 进行删除操作

```go
dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB().
    Where("role_id = ?", roleID).
    Delete(&model.RbacRoleResourcePermission{}).Error
```

#### 参数绑定错误

**问题**: 路径参数和查询参数使用错误的标签
**解决**: 正确使用 `path`, `query`, `json` 标签

```go
type GetRoleRequest struct {
    RoleID int64 `path:"roleId,string" binding:"required"`  // 路径参数
}

type ListRolesRequest struct {
    SpaceID int64 `query:"space_id,string" binding:"required"`  // 查询参数
}
```
