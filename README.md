# Lab1 · SVG 命令行编辑器

高级软件开发技术，Phase 1。使用 TypeScript、Command 与 Composite 实现六种 SVG 图形的编辑、持久化及撤销重做。

已实现要求中的全部 19 个命令、六种内置图形、容器嵌套、图层调整、错误原子性和历史屏障。70 项自动化测试通过，并在 Windows/Node 18 与 Linux/Node 24 上运行 CI。

在本机打开 PowerShell：

```powershell
Set-Location 'D:\课程作业\Lab1'
npm ci
npm test
npm run cli
```

要求 Node.js 18.18 或更高版本。交互中输入 `help` 查看命令，Ctrl+C 或输入结束（Windows 为 Ctrl+Z 后回车）退出。

```text
init 400 200
create g scene
create rect r 30 70 120 60 #4a90d9 in scene
create text t 50 105 "开始" in scene
move scene 20 0
undo
save demo.svg
```

SVG 可直接用浏览器打开。`save` 后历史被封锁，直到下一条成功的编辑命令。省略 `save` 路径时，使用最近一次成功读入或保存的路径。

教师流程图回放：`npm run demo`，输出 [examples/flowchart.svg](examples/flowchart.svg)。也可使用 `npm run cli -- --script "命令文件.txt"` 或把命令逐行送入标准输入。文件路径相对于启动目录；带空格时使用双引号。脚本遇错仍继续，结束时以退出码 1 表示曾有命令失败。

完整架构、实现边界、过程记录、一致性自查和验收依据见 [doc/README.md](doc/README.md)。

仓库：[Jiayang-Xiao/Lab1](https://github.com/Jiayang-Xiao/Lab1)。最终提交标签为 `final`，查看提交过程可执行 `git log --oneline --reverse`。

SVG 读入限于本阶段六种元素及文档中列明的属性/简单变换；`box` 按要求留待后续插件化阶段。

教师原始要求保留在 [phase_cli_1.md](phase_cli_1.md)。
