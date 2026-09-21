# iStore UPS Manager (v1.0.0)

[![License: GPL-2.0](https://img.shields.io/badge/License-GPL--2.0-blue.svg)](LICENSE)
[![OpenWrt](https://img.shields.io/badge/OpenWrt-23.05%20%7C%2024.10%20%7C%2025.x-brightgreen.svg)](https://openwrt.org)
[![iStoreOS](https://img.shields.io/badge/iStoreOS-25.12%2B-5e72e4.svg)](https://istoreos.com)

**iStore UPS Manager** 是一套专为 **OpenWrt** 及 **iStoreOS** 打造的企业级、高颜值、易用安全的现代化 UPS 电源管理系统。

深度适配 iStoreOS 软件中心与 LuCI 2.0+ 客户端渲染 JavaScript SPA 架构，底层无缝结合工业级开源驱动项目 NUT (Network UPS Tools)，为家庭软路由、轻 NAS、All-in-One 主机及企业边缘机房提供全方位的供电保障、能耗计量、历史追溯与智能多机联动断电防护。

---

## 🌟 核心特性

1. **硬件智能识别与自动匹配**
   - 自动扫描物理总线，智能枚举 USB 及串口设备；
   - 识别 VendorID (VID)、ProductID (PID)、序列号及设备描述；
   - 预置海量 UPS 品牌签名库（CyberPower、APC、山特 Santak、科华 Kehua、伊顿 Eaton、Powercom 等），一键推荐并填入最优 NUT 驱动。
2. **极速高颜值监控大屏 (LuCI JS SPA)**
   - 纯客户端渲染，秒级打开，完美自适应手机、平板及桌面宽屏；
   - 深度兼容 Argon 主题与深浅色模式无缝自适应；
   - 实时总览：电网状态、电池电量进度环、持续续航时间、输出负载率、实时功率、输入/输出电压与工频、机内温度及通信状态。
3. **真实性原则与防虚构设计**
   - 严格根据设备硬件底层报告字段展示，不支持的项目明确标注为【不支持/未提供】，严禁臆测伪造数据；
   - 真实功率与估算功率（额定功率 × 负载率）清晰分级标注，明确提示算法依据与可能误差。
4. **历史数据曲线与时序可视化**
   - 采用零依赖原生 SVG 高性能渲染引擎，平滑顺畅；
   - 支持 1小时、6小时、24小时跨度切换与全量时序数据 CSV 导出；
   - 市电断电故障事件红线高亮标记，故障溯源一目了然。
5. **电能质量检测与防抖滞回引擎**
   - 电压过压、欠压告警及可配置滞回回差（Hysteresis），杜绝市电临界波动反复报警；
   - 电网工频偏离与机内过温告警监控。
6. **设备能力全景识别 (Read-Only Capability Map)**
   - 全量映射 `upsc` 原始通信字段，提供人性化中文释义、工程单位及分类（实测/报告/系统）；
   - 支持一键导出原始数据文本与 JSON 审计报告；
   - 只读审计设计，识别阶段严禁执行危险控制命令。
7. **零闪存磨损存储架构 (Flash Anti-Wear Architecture)**
   - 针对嵌入式路由器 Flash 特性深度优化，高频监控采样点仅驻留在内存环形队列（`/tmp/run` tmpfs）；
   - 严禁每 3 秒向 Flash 写入，历史统计采取低频定周期压缩持久化，最大程度延长路由器存储颗粒寿命。
8. **多机联动安全停机与分级策略**
   - 满足断电时间、剩余电量或低续航阈值时触发自动保护；
   - 关机优先级机制：优先向局域网 NAS、PVE、物理机发送安全下线指令，确保存储安全刷盘后再关闭路由器系统；
   - 市电恢复可逆中止保护；
   - 危险控制（如关闭 UPS 逆变输出）具备二次防误触保护。
9. **多渠道智能告警推送**
   - 原生支持：**企业微信机器人**、**钉钉自定义机器人**、**飞书机器人**、**Bark (iOS)**、**Server酱** 及 **通用 Webhook**；
   - 支持断电、市电恢复、电池告急、过载及通信故障通知；
   - 访问令牌与密钥输入框脱敏遮蔽保护，内置通知防抖限频机制。
10. **一键系统诊断工具箱**
    - 快速自检 NUT 核心程序、守护进程状态、驱动活性、USB 总线节点挂载及网络监听安全等级。

---

## 📦 架构与目录规范

```text
luci-app-istore-ups/
├── Makefile                               # OpenWrt 编译安装规则
├── app.json                               # iStoreOS 软件中心应用元数据
├── icon.png                               # 软件中心高分辨率应用图标
├── LICENSE                                # 开源许可证 (GPL-2.0)
├── README.md                              # 项目使用与技术说明文档
├── root/                                  # 系统目标落地文件
│   ├── etc/
│   │   ├── config/istore_ups              # UCI 配置文件
│   │   ├── init.d/istore-ups              # procd 系统服务脚本
│   │   └── uci-defaults/80_istore_ups     # 首次安装配置初始化
│   └── usr/
│       ├── bin/
│       │   ├── istore-ups-daemon          # 后台状态轮询、防抖与环形缓存守护
│       │   ├── istore-ups-notify          # 多通道告警推送调度器
│       │   └── istore-ups-shutdown        # 多设备联动停机协调器
│       ├── libexec/rpcd/luci.istore-ups   # ubus / rpcd 专用后端接口实现
│       └── share/
│           ├── acl.d/luci-app-istore-ups.json     # LuCI 权限访问清单
│           └── luci/menu.d/luci-app-istore-ups.json # LuCI 多级导航菜单
└── htdocs/luci-static/resources/view/istore-ups/
    ├── overview.js                        # 监控总览仪表盘
    ├── charts.js                          # 历史数据可视化曲线
    ├── energy.js                          # 用电量与能耗报表
    ├── quality.js                         # 电能质量检测配置
    ├── capability.js                      # 设备能力识别与原始映射
    ├── settings.js                        # 硬件扫描与基础设置
    ├── shutdown.js                        # 断电保护与联动停机
    ├── notification.js                    # 消息通知与测试推送
    └── diagnosis.js                       # 系统维护诊断与事件日志
```

---

## 🛠️ 安装与部署指南

### 方法一：通过 iStoreOS 软件中心一键安装（推荐）
1. 登录 iStoreOS 后台，打开 **iStore 软件中心**；
2. 搜索 `iStore UPS Manager` 或 `istore-ups`；
3. 点击 **安装**，软件中心将自动安装所需 NUT 驱动并完成系统集成；
4. 进入 **服务** -> **UPS 管理** 开始使用。

### 方法二：通过命令行手动安装 (opkg / apk)

#### 1. 针对标准 OpenWrt / iStoreOS (使用 opkg)
```bash
# 更新软件源
opkg update

# 安装核心依赖
opkg install nut nut-common nut-server nut-upsmon nut-upsc nut-driver-usbhid-ups curl

# 若为国产山特、科华等串口/USB设备，建议加装：
opkg install nut-driver-blazer_usb

# 安装本插件
opkg install luci-app-istore-ups_1.0.0-1_all.ipk
```

#### 2. 针对未来基于 apk 包管理的新版 OpenWrt
```bash
apk update
apk add nut-server nut-upsmon nut-upsc nut-driver-usbhid-ups curl
apk add --allow-untrusted luci-app-istore-ups-1.0.0-r1.apk
```

---

## 🔨 从源码编译

将本仓库克隆至 OpenWrt 源码根目录下的 `package` 目录中：

```bash
cd /path/to/openwrt/package/
git clone https://github.com/liuyuhao1023/luci-app-istore-ups.git

# 在 menuconfig 中选中
make menuconfig
# 导航路径: LuCI -> 3. Applications -> luci-app-istore-ups -> 选择 <*>

# 编译单独包
make package/luci-app-istore-ups/compile V=s
```

编译生成的 `.ipk` 文件将位于 `bin/packages/<架构>/base/` 或 `bin/packages/<架构>/luci/`。

---

## 🔒 安全性与免责声明

1. **默认网络安全限制**：NUT 服务默认仅绑定本地 `127.0.0.1`，严禁在未经内网安全隔离的情况下直接暴露在 `0.0.0.0` 或公网 WAN 端口。
2. **硬件断电控制防误触**：关闭 UPS 负载输出属于高危操作。如果市电在此时恰好恢复，部分 UPS 可能会处于断电保护锁定状态，需要现场人工按键冷启动。请务必在充分理解后果并在家庭/机房环境充分测试后再决定是否开启。

---

## 📄 开源许可证

本项目基于 [GNU General Public License v2.0](LICENSE) 开源发布。
欢迎提交 Issue 和 Pull Request 共同改进！
