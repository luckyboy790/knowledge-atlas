# 第三方内容与组件

原项目的 CC BY-NC 4.0 不覆盖下列独立组件的原有许可，也不转授未包含的教材版权。

| 组件 | 随包标注版本 | 许可文件 |
|---|---|---|
| Cytoscape | 3.30.4 | `assets/vendor/LICENSE-cytoscape.txt`，MIT |
| dagre | 0.8.5 | `assets/vendor/LICENSE-dagre.txt`，MIT |
| cytoscape-dagre | 2.5.0 | `assets/vendor/LICENSE-cytoscape-dagre.txt`，MIT |
| qrcode-generator | 2.0.4 | `assets/vendor/LICENSE-qrcode-generator.txt`，MIT |

上述版本来自随包 VENDOR.md，未重新从 npm 下载比对。dagre 浏览器包还包含 graphlib 和 lodash；VENDOR.md 记录其 MIT 许可，本次补充了 graphlib 2.1.8 和 lodash 4.17.15 的官方许可证全文，分别见 `LICENSE-graphlib.txt` 和 `LICENSE-lodash.txt`。运行导出确认 graphlib 为 2.1.8；dagre v0.8.5 的官方 package.json 声明 lodash ^4.17.15，打包产物未单独导出 lodash 精确补丁版本，故不声称完成其精确版本复现。VENDOR.md 提及的 jsQR 测试依赖不在本候选目录中。

大学数学参考 OpenStax、Nicholson 等资料，其扩展数据按 CC BY-NC-SA 4.0 提供；作者、来源及线性代数参考材料的 GFDL 边界保留于 `UNIVERSITY-NOTICE.md`。没有以根目录许可证覆盖这些独立许可。

其他教材书目、章节目次、来源链接及页码记录保留在各 `data/*sources.json` 中。公开可访问不等于授权再分发。本次未逐题对照所有教材或完成全量相似性审查；保留来源不表示出版社授权、认证或背书。
