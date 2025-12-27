# AdFlux-Track

AdFlux 追踪系统，使用 Vite 构建。

## 原型

最小可用原型和讨论过程在 [prototype](https://github.com/USST-JavaWeb-251-AdFlux/AdFlux-Tracker/tree/prototype) 分支中。

## 开发

安装依赖：

```bash
pnpm i
```

启动开发服务器：

```bash
pnpm run dev
```

构建准生产环境版本（保留 `console`）：

```bash
pnpm run build:staging
```

构建生产版本（移除 `console`）：

```bash
pnpm run build
```

代码检查：

```bash
pnpm run lint
```

代码格式化：

```bash
pnpm run format
```
