# AdFlux Prototype

AdFlux 用户追踪系统的原型设计，实现了一个最小的跨域追踪用户方案。

## 文件说明

```plaintext
AdFlux-Prototype
├── AdFlux  // AdFlux 站点
│   ├── generator.js
│   ├── tracker.html
│   ├── tracker.js
│   └── utils.js
├── README.md
├── SiteB   // 内容网站 B
│   └── index.html
└── SiteC   // 内容网站 C
    └── index.html
```

AdFlux 站点及两个内容网站，分别部署于三个不同域名下，其请求均为跨域请求。

## 方案说明

经研究，初步提出了以下方案用于追踪用户：

| 方案名称                 | 优势                         | 劣势                                       | 备注 |
| ------------------------ | ---------------------------- | ------------------------------------------ | ---- |
| 1. A - 三方 Cookie       | 历史悠久，实现简便，用户无感 | 现代浏览器严格管制                         | [1]  |
| 1. B - 三方 LocalStorage | 实现简便，用户无感           | 现代浏览器多数分区存放，无法跨域获取       |      |
| 2. CNAME 伪装            | 效果好，不受浏览器管制       | 若使用 HTTPS，难以平衡证书和主体信誉安全性 | [2]  |
| 3. 浏览器指纹            | 不受浏览器管制               | 实现复杂，不可靠，违规收集用户隐私         | [3]  |
| 4. 二次重定向            | 不受浏览器管制，可靠         | 用户感知明显，体验差                       | [4]  |
| 5. HSTS 缓存等           | 无                           | 实现复杂，不可靠，现代浏览器严格管制       |      |
| 6. IP 地址               | 不受浏览器管制               | 非常不可靠                                 |      |

> [1] “三方”指：用户访问的网站（内容网站）与 Cookie 所在域（AdFlux）不在同一域下。通过 SameSite=None 属性和 requestStorageAccess API，可以在部分浏览器中继续跨域访问三方 Cookie，详见 `tracker.js` 中注释。经过测试，在默认配置下，Chrome、Firefox、Edge 浏览器可以成功读取三方 Cookie，而 Safari 在默认配置下无法读取。（浏览器更新后可能失效）
>
> [2] 内容网站将 AdFlux 作为二级域名的 CNAME 记录，以将“三方”伪装成“一方”。但在 HTTPS 场景下，需要内容网站提供证书（或者证书的鉴权方式），不利于内容网站的主体信誉安全。
>
> [3] 通过屏幕尺寸等硬件信息、计算 Canvas 等方式收集硬件设备的差异信息，综合计算 hash。
>
> [4] 在初次访问内容网站时，重定向至 AdFlux，其通过 param 返回 trackId，并存储为一方 Cookie。

经讨论，最终选择 三方 Cookie 作为主要方案，二次重定向 作为备用方案（若实现，可供内容网站选择运用方式）。

## 追踪流程

对于内容网站而言，只需在网页 `<head>` 部分添加：

```html
<meta name="adflux-page-category" content="网页类型" />
```

在 `<body>` 底部添加：

```html
<script src="https://adflux/generator.js" type="module" defer></script>
```

之后，当用户访问内容网站时，`generator.js` 就会完成以下操作（其中，括号内为实际业务逻辑，原型中未实现）：

1. 通过读取 `<meta>` 标签，获取该网页对应的类型（并上报 AdFlux 服务器）；
2. 引入 `tracker.html` 作为 `<iframe>`（并隐藏），（同时将预留的广告位替换为实际的广告链接）；
3. `tracker.html` 中，使用 `tracker.js` 读取或设置三方 Cookie（并上报 AdFlux 服务器）。

## 参考资料

-   [第三方 Cookie - MDN](https://developer.mozilla.org/zh-CN/docs/Web/Privacy/Guides/Third-party_cookies)
-   [存储访问 API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API)
-   [SameSite Cookie 说明 - web.dev](https://web.dev/articles/samesite-cookies-explained?hl=zh-cn)
-   [第三方 Cookie 限制 - Google Privacy Sandbox](https://privacysandbox.google.com/cookies/prepare/overview?hl=zh-cn)
