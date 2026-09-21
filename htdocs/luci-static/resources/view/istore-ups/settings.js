'use strict';
'require view';
'require form';
'require rpc';
'require ui';

var callScanDevices = rpc.declare({
	object: 'luci.istore-ups',
	method: 'scan_devices',
	expect: { '': {} }
});

var callTestConnection = rpc.declare({
	object: 'luci.istore-ups',
	method: 'test_connection',
	expect: { '': {} }
});

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('istore_ups', _('iStore UPS Manager 服务配置'),
			_('在此配置 UPS 硬件接入方式、NUT 核心服务参数及基础断电保护联动规则。'));

		// 1. Global section
		s = m.section(form.NamedSection, 'global', 'global', _('全局运行参数'));
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('启用 UPS 管理服务'));
		o.rmempty = false;
		o.default = '1';

		o = s.option(form.ListValue, 'poll_interval', _('数据轮询采样间隔'));
		o.value('1', _('1 秒 (高频高灵敏)'));
		o.value('2', _('2 秒'));
		o.value('3', _('3 秒 (推荐平衡)'));
		o.value('5', _('5 秒'));
		o.value('10', _('10 秒 (极低功耗)'));
		o.default = '3';

		o = s.option(form.Flag, 'reuse_existing_nut', _('优先复用现有 NUT 服务'),
			_('若系统已手动安装或由其他插件运行了 upsd 守护进程，则自动复用现有配置，避免驱动重复启动引起 USB 设备冲突。'));
		o.default = '1';

		// 2. Hardware scan & Device selection
		s = m.section(form.NamedSection, 'ups', 'ups', _('UPS 硬件接入与驱动配置'));
		s.anonymous = true;

		// Scan Button
		o = s.option(form.Button, '_scan', _('硬件快速识别'));
		o.inputtitle = _('扫描当前物理设备 (USB / 串口)');
		o.inputstyle = 'cbi-button-action';
		o.onclick = function(ev) {
			ui.showModal(_('正在扫描系统总线...'), [
				E('p', { 'class': 'spinning' }, _('正在枚举 /sys/bus/usb 与串口设备，请稍候...'))
			]);

			return callScanDevices().then(function(res) {
				ui.hideModal();
				var devices = (res && res.devices) ? res.devices : [];
				if (devices.length === 0) {
					ui.addNotification(null, E('p', {}, _('未检测到任何连接的 USB 设备或串口设备。请检查物理连接。')), 'warning');
					return;
				}

				var listNodes = [];
				for (var i = 0; i < devices.length; i++) {
					var d = devices[i];
					var isMatch = d.is_ups === 1;
					listNodes.push(E('div', {
						'style': 'padding:0.75rem;border:1px solid ' + (isMatch ? '#10b981' : '#cbd5e1') + ';border-radius:0.5rem;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;'
					}, [
						E('div', {}, [
							E('div', { 'style': 'font-weight:600;' }, [
								(d.manufacturer ? d.manufacturer + ' - ' : '') + (d.product || _('未知设备')),
								isMatch ? E('span', { 'class': 'cbi-button cbi-button-apply', 'style': 'padding:1px 6px;font-size:0.75rem;margin-left:8px;' }, _('推荐 UPS')) : ''
							]),
							E('div', { 'style': 'color:#64748b;font-size:0.85rem;font-family:monospace;' }, [
								'VID: ' + (d.vid || 'N/A') + ' | PID: ' + (d.pid || 'N/A') + (d.serial ? ' | S/N: ' + d.serial : '') + ' | 推荐驱动: ' + d.recommended_driver
							])
						]),
						E('button', {
							'class': 'cbi-button cbi-button-apply',
							'data-vid': d.vid,
							'data-pid': d.pid,
							'data-serial': d.serial,
							'data-driver': d.recommended_driver,
							'click': function(e) {
								var btn = e.target;
								var vid = btn.getAttribute('data-vid');
								var pid = btn.getAttribute('data-pid');
								var serial = btn.getAttribute('data-serial');
								var driver = btn.getAttribute('data-driver');

								if (vid) document.querySelector('[name="cbid.istore_ups.ups.vendorid"]').value = vid;
								if (pid) document.querySelector('[name="cbid.istore_ups.ups.productid"]').value = pid;
								if (serial) document.querySelector('[name="cbid.istore_ups.ups.serial"]').value = serial;
								if (driver) document.querySelector('[name="cbid.istore_ups.ups.driver"]').value = driver;

								ui.hideModal();
								ui.addNotification(null, E('p', {}, _('已自动填入设备识别参数与推荐驱动，请保存并应用。')), 'info');
							}
						}, _('选用此设备'))
					]));
				}

				ui.showModal(_('扫描到的物理设备列表'), [
					E('div', {}, listNodes),
					E('div', { 'class': 'right' }, [
						E('button', {
							'class': 'cbi-button cbi-button-neutral',
							'click': function() { ui.hideModal(); }
						}, _('关闭'))
					])
				]);
			}).catch(function(err) {
				ui.hideModal();
				ui.addNotification(null, E('p', {}, _('扫描设备失败: ') + (err.message || err)), 'danger');
			});
		};

		// Test connection button
		o = s.option(form.Button, '_test', _('通信连通性测试'));
		o.inputtitle = _('立即测试当前连接');
		o.inputstyle = 'cbi-button-neutral';
		o.onclick = function() {
			ui.showModal(_('正在探测 UPS 通信...'), [
				E('p', { 'class': 'spinning' }, _('正在执行 upsc 探测，请稍候...'))
			]);

			return callTestConnection().then(function(res) {
				ui.hideModal();
				if (res && res.success) {
					ui.addNotification(null, E('p', {}, _('通信测试成功！检测到设备: ') + (res.model || _('就绪')) + ' (' + _('耗时') + ' ' + res.latency_sec + 's)'), 'info');
				} else {
					ui.addNotification(null, E('p', {}, _('通信测试失败: ') + (res ? res.error : _('未响应'))), 'danger');
				}
			});
		};

		o = s.option(form.ListValue, 'mode', _('工作模式'));
		o.value('standalone', _('单机模式 (USB 直接接入路由器)'));
		o.value('netserver', _('网络服务模式 (本机连硬件，充当 NUT 服务器)'));
		o.value('netclient', _('网络客户端模式 (从机，连接远端 NUT 服务器)'));
		o.default = 'standalone';

		o = s.option(form.ListValue, 'driver', _('NUT 通信驱动'));
		o.value('usbhid-ups', _('usbhid-ups (通用 USB-HID 规范: APC, CyberPower, 山特USB等)'));
		o.value('blazer_usb', _('blazer_usb (USB 串口 Megatec 协议: 国产山特, 科华等)'));
		o.value('blazer_ser', _('blazer_ser (RS-232 串口 Megatec 协议)'));
		o.value('apcsmart', _('apcsmart (APC Smart 串口协议)'));
		o.value('snmp-ups', _('snmp-ups (机房网络 SNMP 卡)'));
		o.value('dummy-ups', _('dummy-ups (调试与模拟测试驱动)'));
		o.default = 'usbhid-ups';

		o = s.option(form.Value, 'port', _('设备通信端口 / 路径'));
		o.default = 'auto';
		o.placeholder = 'auto 或 /dev/ttyUSB0';

		o = s.option(form.Value, 'vendorid', _('USB VendorID (选填)'), _('用于多个同类设备时精准绑定硬件'));
		o.placeholder = '0764';

		o = s.option(form.Value, 'productid', _('USB ProductID (选填)'));
		o.placeholder = '0501';

		o = s.option(form.Value, 'serial', _('设备序列号 (选填)'));

		o = s.option(form.Value, 'nominal_power', _('额定有功功率 (W)'),
			_('当 UPS 硬件传感器未提供 realpower 字段时，系统将使用 (额定功率 × 负载率) 估算当前功率与用电量。'));
		o.datatype = 'uinteger';
		o.default = '600';

		// 3. Network service security
		s = m.section(form.NamedSection, 'nut_service', 'nut_service', _('NUT 服务与安全访问'));
		s.anonymous = true;

		o = s.option(form.Value, 'listen_address', _('监听网络地址'),
			_('为安全起见，默认仅监听 127.0.0.1 回环地址。严禁设置 0.0.0.0 以免将控制端口暴露在 WAN / 公网。'));
		o.datatype = 'ip4addr';
		o.default = '127.0.0.1';

		o = s.option(form.Value, 'listen_port', _('服务端口'));
		o.datatype = 'port';
		o.default = '3493';

		return m.render();
	}
});
