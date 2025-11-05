# RBAC权限系统集成指南

## 📋 概述

本文档说明如何在现有的资源API（Agent、Workflow、Knowledge、Plugin、Database）中集成RBAC权限检查。

---

## 🚀 快速开始

### 方式1：使用中间件（推荐）

在路由注册时添加权限检查中间件：

```go
import (
    "github.com/coze-dev/coze-studio/backend/api/middleware"
    "github.com/coze-dev/coze-studio/backend/domain/rbac/entity"
)

// 示例：Agent相关路由
router.POST("/api/agent/create",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionCreate),
    handler.CreateAgent)

router.PUT("/api/agent/:agentId/update",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionUpdate),
    handler.UpdateAgent)

router.DELETE("/api/agent/:agentId/delete",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionDelete),
    handler.DeleteAgent)

router.POST("/api/agent/:agentId/execute",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionExecute),
    handler.ExecuteAgent)
```

### 方式2：在Handler内部检查

当需要更灵活的权限控制时，在Handler内部调用权限检查：

```go
func UpdateAgent(ctx context.Context, c *app.RequestContext) {
    var req UpdateAgentRequest
    c.BindAndValidate(&req)

    // 获取用户信息
    userID := getUserID(c)
    spaceID := req.SpaceID

    // 检查权限
    hasPermission, err := middleware.CheckPermissionFunc(
        ctx, userID, spaceID,
        entity.ResourceTypeAgent,
        req.AgentID,
        entity.ActionUpdate,
    )

    if err != nil || !hasPermission {
        c.JSON(403, map[string]interface{}{
            "code": 403,
            "msg":  "Permission denied",
        })
        return
    }

    // 继续处理业务逻辑...
}
```

---

## 📝 完整集成示例

### 示例1：Agent API集成

在 `/backend/api/router/coze/api.go` 或单独的路由文件中：

```go
// 修改前
router.POST("/api/draftbot/create", coze.DraftBotCreate)
router.POST("/api/draftbot/update_display_info", coze.UpdateDraftBotDisplayInfo)
router.POST("/api/draftbot/delete", coze.DeleteDraftBot)
router.POST("/api/draftbot/publish", coze.PublishDraftBot)

// 修改后 - 添加权限检查
router.POST("/api/draftbot/create",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionCreate),
    coze.DraftBotCreate)

router.POST("/api/draftbot/update_display_info",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionUpdate),
    coze.UpdateDraftBotDisplayInfo)

router.POST("/api/draftbot/delete",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionDelete),
    coze.DeleteDraftBot)

router.POST("/api/draftbot/publish",
    middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionPublish),
    coze.PublishDraftBot)
```

### 示例2：Workflow API集成

```go
// Workflow路由集成
_workflow := _api.Group("/workflow_api")
{
    _workflow.POST("/create",
        middleware.RBACMiddleware(entity.ResourceTypeWorkflow, entity.ActionCreate),
        coze.CreateWorkflow)

    _workflow.POST("/save",
        middleware.RBACMiddleware(entity.ResourceTypeWorkflow, entity.ActionUpdate),
        coze.SaveWorkflow)

    _workflow.POST("/delete",
        middleware.RBACMiddleware(entity.ResourceTypeWorkflow, entity.ActionDelete),
        coze.DeleteWorkflow)

    _workflow.POST("/run",
        middleware.RBACMiddleware(entity.ResourceTypeWorkflow, entity.ActionExecute),
        coze.RunWorkflow)
}
```

### 示例3：Knowledge API集成

```go
// Knowledge路由集成
_knowledge := _api.Group("/knowledge")
{
    _knowledge.POST("/create",
        middleware.RBACMiddleware(entity.ResourceTypeKnowledge, entity.ActionCreate),
        coze.CreateDataset)

    _knowledge.POST("/update",
        middleware.RBACMiddleware(entity.ResourceTypeKnowledge, entity.ActionUpdate),
        coze.UpdateDataset)

    _knowledge.POST("/delete",
        middleware.RBACMiddleware(entity.ResourceTypeKnowledge, entity.ActionDelete),
        coze.DeleteDataset)

    // Document操作也使用Knowledge权限
    _document := _knowledge.Group("/document")
    {
        _document.POST("/create",
            middleware.RBACMiddleware(entity.ResourceTypeKnowledge, entity.ActionManage),
            coze.CreateDocument)

        _document.POST("/delete",
            middleware.RBACMiddleware(entity.ResourceTypeKnowledge, entity.ActionManage),
            coze.DeleteDocument)
    }
}
```

### 示例4：Plugin API集成

```go
// Plugin路由集成
_plugin := _api.Group("/plugin_api")
{
    _plugin.POST("/register_plugin_meta",
        middleware.RBACMiddleware(entity.ResourceTypePlugin, entity.ActionCreate),
        coze.RegisterPluginMeta)

    _plugin.POST("/update",
        middleware.RBACMiddleware(entity.ResourceTypePlugin, entity.ActionUpdate),
        coze.UpdatePlugin)

    _plugin.POST("/publish_plugin",
        middleware.RBACMiddleware(entity.ResourceTypePlugin, entity.ActionPublish),
        coze.PublishPlugin)
}
```

### 示例5：Database API集成

```go
// Database路由集成
_database := _api.Group("/memory/database")
{
    _database.POST("/add",
        middleware.RBACMiddleware(entity.ResourceTypeDatabase, entity.ActionCreate),
        coze.AddDatabase)

    _database.POST("/update",
        middleware.RBACMiddleware(entity.ResourceTypeDatabase, entity.ActionUpdate),
        coze.UpdateDatabase)

    _database.POST("/delete",
        middleware.RBACMiddleware(entity.ResourceTypeDatabase, entity.ActionDelete),
        coze.DeleteDatabase)

    _database.POST("/list_records",
        middleware.RBACMiddleware(entity.ResourceTypeDatabase, entity.ActionQuery),
        coze.ListDatabaseRecords)
}
```

---

## 🔧 高级用法

### 1. 需要多个权限之一

```go
// 用户需要有read或execute权限之一
router.GET("/api/agent/:id",
    middleware.RequireAnyPermission(
        entity.ResourceTypeAgent,
        entity.ActionRead,
        entity.ActionExecute,
    ),
    coze.GetAgent)
```

### 2. 需要多个权限全部拥有

```go
// 用户必须同时拥有update和publish权限
router.POST("/api/agent/publish",
    middleware.RequireAllPermissions(
        entity.ResourceTypeAgent,
        entity.ActionUpdate,
        entity.ActionPublish,
    ),
    coze.PublishAgent)
```

### 3. 在Handler中动态检查

当权限检查需要基于业务逻辑时：

```go
func CopyAgent(ctx context.Context, c *app.RequestContext) {
    // 需要对源Agent有read权限，对目标Space有create权限

    userID := getUserID(c)
    sourceAgentID := c.Param("sourceId")
    targetSpaceID := c.Param("targetSpaceId")

    // 检查源Agent的read权限
    canRead, _ := middleware.CheckPermissionFunc(
        ctx, userID, getSourceSpaceID(sourceAgentID),
        entity.ResourceTypeAgent, sourceAgentID,
        entity.ActionRead,
    )

    // 检查目标Space的create权限
    canCreate, _ := middleware.CheckPermissionFunc(
        ctx, userID, targetSpaceID,
        entity.ResourceTypeAgent, 0,
        entity.ActionCreate,
    )

    if !canRead || !canCreate {
        c.JSON(403, "Permission denied")
        return
    }

    // 执行复制逻辑...
}
```

---

## 📊 权限配置示例

### 创建角色并配置权限

```bash
# 1. 创建"内容创作者"角色
curl -X POST http://localhost:8888/api/rbac/roles \
  -H "Content-Type: application/json" \
  -d '{
    "space_id": "100",
    "name": "内容创作者",
    "description": "可以创建和编辑Agent和Workflow，但不能删除"
  }'

# 2. 配置角色权限
curl -X POST http://localhost:8888/api/rbac/roles/1/permissions/batch \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "1",
    "permissions": [
      {
        "resource_type": 4,
        "resource_id": 0,
        "actions": ["create", "read", "update", "execute"]
      },
      {
        "resource_type": 6,
        "resource_id": 0,
        "actions": ["create", "read", "update", "execute"]
      },
      {
        "resource_type": 7,
        "resource_id": 0,
        "actions": ["read"]
      }
    ]
  }'

# 3. 分配角色给用户
curl -X POST http://localhost:8888/api/rbac/users/999/roles \
  -H "Content-Type: application/json" \
  -d '{
    "space_id": "100",
    "user_id": "999",
    "role_id": "1"
  }'
```

---

## ⚠️ 注意事项

### 1. 用户ID和SpaceID获取

中间件需要从请求上下文获取userID和spaceID。请根据项目实际情况修改 `/backend/api/middleware/rbac.go` 中的辅助函数：

```go
// 需要修改这两个函数
func getUserIDFromContext(c *app.RequestContext) int64
func getSpaceIDFromContext(c *app.RequestContext) int64
```

### 2. 超级管理员豁免

如果需要为超级管理员设置权限豁免，在中间件中添加：

```go
func RBACMiddleware(resourceType entity.ResourceType, action entity.Action) app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        userID := getUserIDFromContext(c)

        // 超级管理员豁免
        if isSuperAdmin(userID) {
            c.Next(ctx)
            return
        }

        // 继续正常的权限检查...
    }
}
```

### 3. 资源ID为0的含义

当resourceID为0时，表示检查对该资源类型的通用权限（不针对特定资源实例）。这通常用于create操作。

---

## 🧪 测试

### 测试权限检查

```bash
# 检查用户权限
curl -X POST http://localhost:8888/api/rbac/check \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "999",
    "space_id": "100",
    "resource_type": 4,
    "resource_id": "123",
    "action": "update"
  }'

# 响应
{
  "code": 0,
  "data": {
    "has_permission": true
  }
}
```

---

## 📚 资源类型和操作映射

| 资源类型  | resource_type | 支持的操作                                     |
| --------- | ------------- | ---------------------------------------------- |
| Agent     | 4             | create, read, update, delete, execute, publish |
| Plugin    | 5             | create, read, update, delete, install          |
| Workflow  | 6             | create, read, update, delete, execute, publish |
| Knowledge | 7             | create, read, update, delete, manage           |
| Database  | 23            | create, read, update, delete, query            |

---

## 完成状态

✅ 所有核心功能已实现并保存：

- ✅ 数据库表（3张表已创建）
- ✅ Domain层（Entity + DAO + Repository + Service）
- ✅ API层（Handler + Model + Routes）
- ✅ 权限检查中间件
- ✅ 集成文档

**下一步：** 根据本文档在现有API中集成权限检查。
