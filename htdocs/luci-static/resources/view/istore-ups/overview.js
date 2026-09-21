'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require poll';

var callGetStatus = rpc.declare({
	object: 'luci.istore-ups',
	method: 'get_status',
	expect: { '': {} }
});

var callGetLogs = rpc.declare({
	object: 'luci.istore-ups',
	method: 'get_logs',
	expect: { '': {} }
});

function formatRuntime(seconds) {
	if (seconds === null || seconds === undefined || isNaN(seconds)) {
		return _('不支持 / 未提供');
	}
	var s = parseInt(seconds, 10);
	if (s < 60) return s + ' ' + _('秒');
	var m = Math.floor(s / 60);
	var remSec = s % 60;
	if (m < 60) return m + ' ' + _('分') + ' ' + remSec + ' ' + _('秒');
	var h = Math.floor(m / 60);
	var remMin = m % 60;
	return h + ' ' + _('小时') + ' ' + remMin + ' ' + _('分');
}

function renderValue(val, unit, fallback) {
	if (val === null || val === undefined || val === '') {
		return E('span', { 'class': 'istore-ups-na' }, fallback || _('不支持'));
	}
	return E('span', {}, [val + (unit ? ' ' + unit : '')]);
}

return view.extend({
	pollInterval: 3,
	isPaused: false,

	load: function() {
		return Promise.all([
			callGetStatus(),
			callGetLogs()
		]);
	},

	render: function(data) {
		var self = this;
		var status = data[0] || {};
		var logs = data[1] || {};

		var container = E('div', { 'class': 'cbi-map istore-ups-container' });

		// Custom Modern Dashboard CSS
		var styleNode = E('style', {}, [
			'.istore-ups-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',
			'.istore-ups-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }',
			'.istore-ups-title { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }',
			'.dark-mode .istore-ups-title { color: #f1f5f9; }',
			'.istore-ups-badges { display: flex; gap: 0.5rem; align-items: center; }',
			'.istore-ups-badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; }',
			'.badge-online { background-color: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); }',
			'.badge-battery { background-color: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); }',
			'.badge-danger { background-color: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); }',
			'.badge-offline { background-color: rgba(107, 114, 128, 0.15); color: #4b5563; border: 1px solid rgba(107, 114, 128, 0.3); }',
			'.istore-ups-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }',
			'.istore-ups-card { background: var(--background-color, #ffffff); border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: transform 0.2s; position: relative; overflow: hidden; }',
			'.dark-mode .istore-ups-card { background: #1e293b; border-color: #334155; }',
			'.card-title { font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 500; display: flex; justify-content: space-between; }',
			'.card-value { font-size: 1.75rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }',
			'.dark-mode .card-value { color: #f8fafc; }',
			'.card-subtext { font-size: 0.8rem; color: #94a3b8; }',
			'.progress-bar-bg { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin: 0.5rem 0; }',
			'.dark-mode .progress-bar-bg { background: #334155; }',
			'.progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }',
			'.bg-emerald { background: #10b981; }',
			'.bg-amber { background: #f59e0b; }',
			'.bg-rose { background: #ef4444; }',
			'.bg-blue { background: #3b82f6; }',
			'.istore-ups-na { color: #94a3b8; font-style: italic; font-size: 1rem; }',
			'.power-tag-est { background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 6px; font-weight: normal; }',
			'.power-tag-real { background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 6px; font-weight: normal; }',
			'.controls-bar { display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }',
			'.table-status { width: 100%; border-collapse: collapse; margin-top: 1rem; }',
			'.table-status th, .table-status td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }',
			'.dark-mode .table-status th, .dark-mode .table-status td { border-bottom-color: #334155; }'
		]);

		var header = E('div', { 'class': 'istore-ups-header' }, [
			E('div', {}, [
				E('h2', { 'class': 'istore-ups-title' }, _('iStore UPS Manager')),
				E('p', { 'class': 'card-subtext', 'id': 'ups-device-desc' },
					(status.manufacturer || status.model) ? (status.manufacturer + ' ' + status.model) : _('正在检测设备...')
				)
			]),
			E('div', { 'class': 'istore-ups-badges', 'id': 'ups-badges-container' },
				self.renderBadges(status)
			)
		]);

		var controls = E('div', { 'class': 'controls-bar' }, [
			E('span', { 'class': 'card-subtext' }, _('自动刷新:')),
			E('select', {
				'class': 'cbi-input-select',
				'id': 'select-poll-interval',
				'change': function(ev) {
					var val = parseInt(ev.target.value, 10);
					if (val === 0) {
						self.isPaused = true;
					} else {
						self.isPaused = false;
						self.pollInterval = val;
					}
				}
			}, [
				E('option', { 'value': '1' }, _('1 秒')),
				E('option', { 'value': '2' }, _('2 秒')),
				E('option', { 'value': '3', 'selected': 'selected' }, _('3 秒 (推荐)')),
				E('option', { 'value': '5' }, _('5 秒')),
				E('option', { 'value': '10' }, _('10 秒')),
				E('option', { 'value': '0' }, _('暂停刷新'))
			])
		]);

		var grid = E('div', { 'class': 'istore-ups-grid', 'id': 'metric-cards-grid' },
			self.renderMetricCards(status)
		]);

		var tableSection = E('div', { 'class': 'cbi-section' }, [
			E('h3', { 'class': 'cbi-section-title' }, _('电能与核心参数细则')),
			E('div', { 'class': 'cbi-section-node' }, [
				E('table', { 'class': 'table-status' }, [
					E('tbody', { 'id': 'ups-details-table' }, self.renderDetailsRows(status))
				])
			])
		]);

		var logSection = E('div', { 'class': 'cbi-section' }, [
			E('h3', { 'class': 'cbi-section-title' }, _('最近事件记录')),
			E('div', { 'class': 'cbi-section-node' }, [
				E('pre', {
					'id': 'recent-logs-pre',
					'style': 'background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:0.5rem;font-size:0.85rem;max-height:240px;overflow-y:auto;'
				}, (logs.logs && logs.logs.length) ? logs.logs.slice(-15).join('\n') : _('暂无事件记录'))
			])
		]);

		dom.append(container, [styleNode, header, controls, grid, tableSection, logSection]);

		// Register polling loop
		poll.add(function() {
			if (self.isPaused) return Promise.resolve();
			return Promise.all([
				callGetStatus(),
				callGetLogs()
			]).then(function(res) {
				self.updateDashboard(res[0], res[1]);
			});
		}, self.pollInterval);

		return container;
	},

	renderBadges: function(status) {
		var badges = [];
		if (!status || !status.connected) {
			badges.push(E('span', { 'class': 'istore-ups-badge badge-offline' }, '● ' + _('通信未就绪 / 离线')));
			return badges;
		}

		if (status.is_on_battery) {
			badges.push(E('span', { 'class': 'istore-ups-badge badge-battery' }, '⚡ ' + _('电池供电中 (市电中断)')));
		} else if (status.is_online) {
			badges.push(E('span', { 'class': 'istore-ups-badge badge-online' }, '✓ ' + _('市电供电正常 (Online)')));
		}

		if (status.is_low_battery) {
			badges.push(E('span', { 'class': 'istore-ups-badge badge-danger' }, '⚠ ' + _('电池电量严重告急 (Low Battery)')));
		}

		return badges;
	},

	renderMetricCards: function(status) {
		var cards = [];

		// 1. Battery Charge Card
		var chargeVal = (status && status.battery_charge !== null) ? status.battery_charge : null;
		var chargeBarColor = 'bg-emerald';
		if (chargeVal !== null && chargeVal <= 20) chargeBarColor = 'bg-rose';
		else if (chargeVal !== null && chargeVal <= 50) chargeBarColor = 'bg-amber';

		cards.push(E('div', { 'class': 'istore-ups-card' }, [
			E('div', { 'class': 'card-title' }, [_('电池剩余电量'), E('span', {}, '🔋')]),
			E('div', { 'class': 'card-value' }, renderValue(chargeVal, '%')),
			E('div', { 'class': 'progress-bar-bg' }, [
				E('div', {
					'class': 'progress-bar-fill ' + chargeBarColor,
					'style': 'width: ' + (chargeVal !== null ? Math.min(100, Math.max(0, chargeVal)) : 0) + '%;'
				})
			]),
			E('div', { 'class': 'card-subtext' }, _('电压: ') + (status.battery_voltage ? status.battery_voltage + ' V' : _('未知')))
		]));

		// 2. Runtime Card
		cards.push(E('div', { 'class': 'istore-ups-card' }, [
			E('div', { 'class': 'card-title' }, [_('预计持续续航'), E('span', {}, '⏱')]),
			E('div', { 'class': 'card-value' }, formatRuntime(status ? status.battery_runtime : null)),
			E('div', { 'class': 'card-subtext', 'style': 'margin-top:1.5rem;' },
				status.is_on_battery ? _('当前正在消耗电池电量') : _('处于浮充/市电维持状态')
			)
		]));

		// 3. Load & Power Card
		var loadVal = (status && status.load_percent !== null) ? status.load_percent : null;
		var powerVal = (status && status.power !== null) ? status.power : null;
		var powerTag = null;
		if (powerVal !== null) {
			if (status.power_is_estimated) {
				powerTag = E('span', { 'class': 'power-tag-est', 'title': _('此 UPS 无直接实测功率传感器，数值由额定功率×负载率计算得出') }, _('软件估算'));
			} else {
				powerTag = E('span', { 'class': 'power-tag-real' }, _('实测功率'));
			}
		}

		cards.push(E('div', { 'class': 'istore-ups-card' }, [
			E('div', { 'class': 'card-title' }, [_('输出负载率'), E('span', {}, '⚡')]),
			E('div', { 'class': 'card-value' }, renderValue(loadVal, '%')),
			E('div', { 'class': 'progress-bar-bg' }, [
				E('div', {
					'class': 'progress-bar-fill bg-blue',
					'style': 'width: ' + (loadVal !== null ? Math.min(100, Math.max(0, loadVal)) : 0) + '%;'
				})
			]),
			E('div', { 'class': 'card-subtext' }, [
				_('当前功率: '),
				powerVal !== null ? (powerVal + ' W') : _('未知'),
				powerTag
			])
		]));

		// 4. Input & Output Voltage Card
		cards.push(E('div', { 'class': 'istore-ups-card' }, [
			E('div', { 'class': 'card-title' }, [_('输入 / 输出电压'), E('span', {}, '🔌')]),
			E('div', { 'class': 'card-value', 'style': 'font-size:1.4rem;' }, [
				(status.input_voltage ? status.input_voltage + ' V' : _('未知')),
				' / ',
				(status.output_voltage ? status.output_voltage + ' V' : _('未知'))
			]),
			E('div', { 'class': 'card-subtext', 'style': 'margin-top:1.5rem;' }, [
				_('输入频率: '),
				(status.input_freq ? status.input_freq + ' Hz' : _('未知')),
				' | ',
				_('温度: '),
				(status.temperature ? status.temperature + ' °C' : _('不支持'))
			])
		]));

		return cards;
	},

	renderDetailsRows: function(status) {
		var rows = [];
		var addRow = function(label, val, unit, note) {
			rows.push(E('tr', {}, [
				E('td', { 'style': 'font-weight:600;width:30%;' }, label),
				E('td', { 'style': 'width:35%;' }, renderValue(val, unit)),
				E('td', { 'style': 'color:#94a3b8;font-size:0.85rem;' }, note || '-')
			]));
		};

		addRow(_('UPS 运行状态 (Status)'), status.status, null, _('NUT 原始状态标识代码'));
		addRow(_('市电输入电压 (Input Voltage)'), status.input_voltage, 'V', _('电网当前实时输入电压'));
		addRow(_('市电输入频率 (Input Frequency)'), status.input_freq, 'Hz', _('电网实时频率 (正常 50Hz / 60Hz)'));
		addRow(_('UPS 逆变输出电压 (Output Voltage)'), status.output_voltage, 'V', _('供给后端设备的实际电压'));
		addRow(_('UPS 逆变输出频率 (Output Frequency)'), status.output_freq, 'Hz', _('逆变输出频率'));
		addRow(_('电池端电压 (Battery Voltage)'), status.battery_voltage, 'V', _('内置蓄电池直流端总电压'));
		addRow(_('设备内部温度 (Temperature)'), status.temperature, '°C', _('UPS 内部温度传感器读数'));
		addRow(_('当前负载率 (Load)'), status.load_percent, '%', _('相对设备最大额定负载的百分比'));
		addRow(_('设备制造商 (Manufacturer)'), status.manufacturer, null, _('硬件厂商签名'));
		addRow(_('设备型号 (Model)'), status.model, null, _('硬件具体型号'));

		return rows;
	},

	updateDashboard: function(status, logs) {
		status = status || {};
		logs = logs || {};

		var badgesNode = document.getElementById('ups-badges-container');
		if (badgesNode) {
			dom.content(badgesNode, this.renderBadges(status));
		}

		var descNode = document.getElementById('ups-device-desc');
		if (descNode && (status.manufacturer || status.model)) {
			descNode.innerText = (status.manufacturer || '') + ' ' + (status.model || '');
		}

		var gridNode = document.getElementById('metric-cards-grid');
		if (gridNode) {
			dom.content(gridNode, this.renderMetricCards(status));
		}

		var tableNode = document.getElementById('ups-details-table');
		if (tableNode) {
			dom.content(tableNode, this.renderDetailsRows(status));
		}

		var logsPre = document.getElementById('recent-logs-pre');
		if (logsPre && logs.logs) {
			logsPre.innerText = logs.logs.slice(-15).join('\n');
		}
	}
});
