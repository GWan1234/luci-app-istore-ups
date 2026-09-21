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
		return _('未提供');
	}
	var s = parseInt(seconds, 10);
	if (s < 60) return s + ' ' + _('秒');
	var m = Math.floor(s / 60);
	var remSec = s % 60;
	if (m < 60) return m + ' ' + _('分') + (remSec > 0 ? ' ' + remSec + ' ' + _('秒') : '');
	var h = Math.floor(m / 60);
	var remMin = m % 60;
	return h + ' ' + _('小时') + (remMin > 0 ? ' ' + remMin + ' ' + _('分') : '');
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

		var container = E('div', { 'class': 'cbi-map istore-clean-dashboard' });

		// Pure Argon-compatible Harmonious CSS Stylesheet
		var styleNode = E('style', {}, [
			'.istore-clean-dashboard { max-width: 1200px; margin: 0 auto; }',
			'.istore-header-card { background: var(--cbi-section-background, #ffffff); border: 1px solid var(--cbi-section-border, #e2e8f0); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }',
			'.istore-device-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 0.5rem; }',
			'.dark-mode .istore-device-title { color: #f8fafc; }',
			'.istore-device-sub { font-size: 0.85rem; color: #64748b; margin: 0.25rem 0 0 0; }',
			'.dark-mode .istore-device-sub { color: #94a3b8; }',
			'.istore-header-right { display: flex; align-items: center; gap: 0.75rem; }',
			'.istore-status-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.825rem; font-weight: 600; }',
			'.pill-normal { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }',
			'.dark-mode .pill-normal { background: rgba(5,150,105,0.2); color: #34d399; border-color: rgba(5,150,105,0.4); }',
			'.pill-battery { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }',
			'.dark-mode .pill-battery { background: rgba(217,119,6,0.2); color: #fbbf24; border-color: rgba(217,119,6,0.4); }',
			'.pill-critical { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }',
			'.dark-mode .pill-critical { background: rgba(220,38,38,0.2); color: #f87171; border-color: rgba(220,38,38,0.4); }',
			'.pill-unknown { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }',
			'.dark-mode .pill-unknown { background: #334155; color: #94a3b8; border-color: #475569; }',
			'.istore-flow-panel { background: var(--cbi-section-background, #ffffff); border: 1px solid var(--cbi-section-border, #e2e8f0); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }',
			'.istore-flow-strip { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; }',
			'.istore-node-box { flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.85rem 1rem; text-align: center; }',
			'.dark-mode .istore-node-box { background: #1e293b; border-color: #334155; }',
			'.istore-node-tag { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 0.25rem; }',
			'.dark-mode .istore-node-tag { color: #94a3b8; }',
			'.istore-node-title { font-size: 1.05rem; font-weight: 700; color: #0f172a; }',
			'.dark-mode .istore-node-title { color: #f8fafc; }',
			'.istore-node-meta { font-size: 0.8rem; color: #059669; font-weight: 600; margin-top: 0.2rem; }',
			'.istore-flow-arrow { color: #94a3b8; font-size: 1.25rem; font-weight: bold; }',
			'.istore-gauges-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem; margin-bottom: 1.25rem; }',
			'.istore-gauge-card { background: var(--cbi-section-background, #ffffff); border: 1px solid var(--cbi-section-border, #e2e8f0); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; align-items: center; }',
			'.istore-card-headline { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-weight: 700; font-size: 0.95rem; color: #334155; }',
			'.dark-mode .istore-card-headline { color: #e2e8f0; }',
			'.istore-circle-wrap { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; margin: 0.5rem 0; }',
			'.istore-circle-inner { position: absolute; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }',
			'.istore-circle-num { font-size: 2.2rem; font-weight: 800; color: #0f172a; line-height: 1; letter-spacing: -0.02em; }',
			'.dark-mode .istore-circle-num { color: #ffffff; }',
			'.istore-circle-caption { font-size: 0.8rem; color: #64748b; margin-top: 0.35rem; font-weight: 500; }',
			'.dark-mode .istore-circle-caption { color: #94a3b8; }',
			'.istore-subdata-grid { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; }',
			'.dark-mode .istore-subdata-grid { border-top-color: #334155; }',
			'.istore-subdata-item { text-align: center; }',
			'.istore-subdata-k { font-size: 0.75rem; color: #64748b; margin-bottom: 0.2rem; }',
			'.dark-mode .istore-subdata-k { color: #94a3b8; }',
			'.istore-subdata-v { font-size: 1.05rem; font-weight: 700; color: #0f172a; }',
			'.dark-mode .istore-subdata-v { color: #f8fafc; }',
			'.istore-matrix-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }',
			'.istore-mini-tile { background: var(--cbi-section-background, #ffffff); border: 1px solid var(--cbi-section-border, #e2e8f0); border-radius: 10px; padding: 1rem 1.25rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03); }',
			'.istore-mini-tile-title { font-size: 0.8rem; color: #64748b; margin-bottom: 0.35rem; display: flex; justify-content: space-between; align-items: center; font-weight: 500; }',
			'.dark-mode .istore-mini-tile-title { color: #94a3b8; }',
			'.istore-mini-tile-val { font-size: 1.35rem; font-weight: 700; color: #0f172a; }',
			'.dark-mode .istore-mini-tile-val { color: #f8fafc; }',
			'.istore-log-box { background: var(--cbi-section-background, #ffffff); border: 1px solid var(--cbi-section-border, #e2e8f0); border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }',
			'.istore-tag-est { background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 0.725rem; font-weight: 600; margin-left: 4px; }',
			'.istore-tag-real { background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 0.725rem; font-weight: 600; margin-left: 4px; }'
		]);

		// Header Card
		var header = E('div', { 'class': 'istore-header-card' }, [
			E('div', {}, [
				E('h2', { 'class': 'istore-device-title' }, [
					'⚡ ', _('iStore UPS Manager'),
					E('span', { 'style': 'font-size:0.75rem;font-weight:600;background:#e0e7ff;color:#4338ca;padding:2px 8px;border-radius:12px;' }, 'v1.0.0')
				]),
				E('p', { 'class': 'istore-device-sub', 'id': 'device-name-sub' },
					(status.manufacturer || status.model) ? (status.manufacturer + ' ' + status.model) : _('正在读取 UPS 状态...')
				)
			]),
			E('div', { 'class': 'istore-header-right' }, [
				E('div', { 'id': 'header-badge-box' }, self.renderStatusBadge(status)),
				E('select', {
					'class': 'cbi-input-select',
					'style': 'margin:0;font-size:0.85rem;padding:0.3rem 0.6rem;border-radius:8px;',
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
					E('option', { 'value': '1' }, _('1 秒刷新')),
					E('option', { 'value': '3', 'selected': 'selected' }, _('3 秒刷新')),
					E('option', { 'value': '5' }, _('5 秒刷新')),
					E('option', { 'value': '10' }, _('10 秒刷新')),
					E('option', { 'value': '0' }, _('暂停刷新'))
				])
			])
		]);

		// Power Flow Strip (Pure CSS & HTML, 100% harmonized alignment)
		var flowPanel = E('div', { 'class': 'istore-flow-panel' }, [
			E('div', { 'style': 'font-size:0.85rem;font-weight:700;color:#64748b;' }, _('供电链路状态 (Power Link Status)')),
			E('div', { 'class': 'istore-flow-strip', 'id': 'power-flow-strip' }, self.renderFlowStrip(status))
		]);

		// Dual Circular Gauges
		var gaugesRow = E('div', { 'class': 'istore-gauges-row' }, [
			E('div', { 'class': 'istore-gauge-card', 'id': 'card-gauge-battery' }, self.renderBatteryCard(status)),
			E('div', { 'class': 'istore-gauge-card', 'id': 'card-gauge-load' }, self.renderLoadCard(status))
		]);

		// Mini Matrix Grid
		var matrixRow = E('div', { 'class': 'istore-matrix-row', 'id': 'matrix-tiles-row' }, self.renderMatrixTiles(status));

		// Event Log Section
		var logBox = E('div', { 'class': 'istore-log-box' }, [
			E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;' }, [
				E('span', { 'style': 'font-weight:700;font-size:0.9rem;' }, _('近期电源事件日志')),
				E('span', { 'style': 'font-size:0.75rem;color:#94a3b8;' }, _('内存滚动记录'))
			]),
			E('pre', {
				'id': 'clean-logs-pre',
				'style': 'margin:0;padding:0.75rem 1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:0.8rem;line-height:1.5;max-height:160px;overflow-y:auto;color:#334155;font-family:monospace;'
			}, (logs.logs && logs.logs.length) ? logs.logs.slice(-15).join('\n') : _('暂无事件记录'))
		]);

		dom.append(container, [styleNode, header, flowPanel, gaugesRow, matrixRow, logBox]);

		// Polling
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

	renderStatusBadge: function(status) {
		if (!status || !status.connected) {
			return E('span', { 'class': 'istore-status-pill pill-unknown' }, '● ' + _('未连接 / 离线'));
		}
		if (status.is_low_battery) {
			return E('span', { 'class': 'istore-status-pill pill-critical' }, '⚠ ' + _('电池严重告急'));
		}
		if (status.is_on_battery) {
			return E('span', { 'class': 'istore-status-pill pill-battery' }, '⚡ ' + _('电池供电中 (市电中断)'));
		}
		if (status.is_online) {
			return E('span', { 'class': 'istore-status-pill pill-normal' }, '✓ ' + _('市电正常在线'));
		}
		return E('span', { 'class': 'istore-status-pill pill-unknown' }, status.status || _('就绪'));
	},

	renderFlowStrip: function(status) {
		var isOnline = status && status.is_online;
		var isBattery = status && status.is_on_battery;

		var gridMeta = isOnline ? (status.input_voltage ? status.input_voltage + ' V · ' + (status.input_freq || 50) + 'Hz' : _('供电正常')) : _('供电中断');
		var gridMetaColor = isOnline ? '#059669' : '#dc2626';

		var upsMeta = isBattery ? _('蓄电池逆变中') : _('市电稳压旁路');
		var upsMetaColor = isBattery ? '#d97706' : '#2563eb';

		var loadWatts = (status && status.power !== null && status.power !== undefined) ? (status.power + ' W') : (status && status.load_percent ? (status.load_percent + '%') : _('负载中'));

		return [
			E('div', { 'class': 'istore-node-box' }, [
				E('div', { 'class': 'istore-node-tag' }, _('1. 电网输入')),
				E('div', { 'class': 'istore-node-title' }, isOnline ? _('市电正常') : _('市电停电')),
				E('div', { 'class': 'istore-node-meta', 'style': 'color:' + gridMetaColor }, gridMeta)
			]),
			E('div', { 'class': 'istore-flow-arrow' }, '➔'),
			E('div', { 'class': 'istore-node-box' }, [
				E('div', { 'class': 'istore-node-tag' }, _('2. UPS 主机')),
				E('div', { 'class': 'istore-node-title' }, status && status.model ? status.model : _('UPS 就绪')),
				E('div', { 'class': 'istore-node-meta', 'style': 'color:' + upsMetaColor }, upsMeta)
			]),
			E('div', { 'class': 'istore-flow-arrow' }, '➔'),
			E('div', { 'class': 'istore-node-box' }, [
				E('div', { 'class': 'istore-node-tag' }, _('3. 输出端设备')),
				E('div', { 'class': 'istore-node-title' }, status && status.output_voltage ? (status.output_voltage + ' V') : '220 V'),
				E('div', { 'class': 'istore-node-meta', 'style': 'color:#2563eb;' }, _('当前负载 ') + loadWatts)
			])
		];
	},

	renderSvgDonut: function(percent, strokeColor) {
		var size = 150;
		var stroke = 12;
		var radius = (size - stroke) / 2;
		var circumference = radius * 2 * Math.PI;
		var clamped = Math.min(100, Math.max(0, percent || 0));
		var strokeDashoffset = circumference - (clamped / 100) * circumference;

		return [
			'<svg width="' + size + '" height="' + size + '" style="transform: rotate(-90deg); display: block;">',
			'<circle stroke="#f1f5f9" fill="transparent" stroke-width="' + stroke + '" r="' + radius + '" cx="' + (size/2) + '" cy="' + (size/2) + '" />',
			'<circle stroke="' + strokeColor + '" fill="transparent" stroke-width="' + stroke + '" stroke-dasharray="' + circumference + ' ' + circumference + '" style="stroke-dashoffset: ' + strokeDashoffset + '; transition: stroke-dashoffset 0.6s ease;" stroke-linecap="round" r="' + radius + '" cx="' + (size/2) + '" cy="' + (size/2) + '" />',
			'</svg>'
		].join('');
	},

	renderBatteryCard: function(status) {
		var charge = (status && status.battery_charge !== null) ? status.battery_charge : null;
		var color = '#10b981';
		if (charge !== null && charge <= 20) color = '#ef4444';
		else if (charge !== null && charge <= 50) color = '#f59e0b';

		var runtimeText = formatRuntime(status ? status.battery_runtime : null);
		var voltageText = status && status.battery_voltage ? (status.battery_voltage + ' V') : _('未知');

		return [
			E('div', { 'class': 'istore-card-headline' }, [
				E('span', {}, ['🔋 ', _('蓄电池组荷电状态')]),
				E('span', { 'style': 'font-size:0.8rem;color:#64748b;font-weight:normal;' }, status && status.is_on_battery ? _('放电中') : _('浮充维持'))
			]),
			E('div', { 'class': 'istore-circle-wrap' }, [
				(function() {
					var w = E('div', {});
					w.innerHTML = this.renderSvgDonut(charge !== null ? charge : 0, color);
					return w;
				}).call(this),
				E('div', { 'class': 'istore-circle-inner' }, [
					E('div', { 'class': 'istore-circle-num' }, [
						charge !== null ? charge : '--',
						E('span', { 'style': 'font-size:1.1rem;font-weight:500;color:#64748b;margin-left:2px;' }, '%')
					]),
					E('div', { 'class': 'istore-circle-caption' }, _('剩余电量'))
				])
			]),
			E('div', { 'class': 'istore-subdata-grid' }, [
				E('div', { 'class': 'istore-subdata-item' }, [
					E('div', { 'class': 'istore-subdata-k' }, _('预估放电续航')),
					E('div', { 'class': 'istore-subdata-v', 'style': 'color:#2563eb;' }, runtimeText)
				]),
				E('div', { 'class': 'istore-subdata-item' }, [
					E('div', { 'class': 'istore-subdata-k' }, _('电池端母线电压')),
					E('div', { 'class': 'istore-subdata-v' }, voltageText)
				])
			])
		];
	},

	renderLoadCard: function(status) {
		var load = (status && status.load_percent !== null) ? status.load_percent : null;
		var color = '#3b82f6';
		if (load !== null && load >= 80) color = '#ef4444';
		else if (load !== null && load >= 60) color = '#f59e0b';

		var powerVal = (status && status.power !== null && status.power !== undefined) ? status.power : null;
		var powerTag = null;
		if (powerVal !== null) {
			if (status.power_is_estimated) {
				powerTag = E('span', { 'class': 'istore-tag-est' }, _('估算'));
			} else {
				powerTag = E('span', { 'class': 'istore-tag-real' }, _('实测'));
			}
		}

		return [
			E('div', { 'class': 'istore-card-headline' }, [
				E('span', {}, ['⚡ ', _('逆变负载与输出功率')]),
				E('span', { 'style': 'font-size:0.8rem;color:#64748b;font-weight:normal;' }, _('负荷占用'))
			]),
			E('div', { 'class': 'istore-circle-wrap' }, [
				(function() {
					var w = E('div', {});
					w.innerHTML = this.renderSvgDonut(load !== null ? load : 0, color);
					return w;
				}).call(this),
				E('div', { 'class': 'istore-circle-inner' }, [
					E('div', { 'class': 'istore-circle-num' }, [
						load !== null ? load : '--',
						E('span', { 'style': 'font-size:1.1rem;font-weight:500;color:#64748b;margin-left:2px;' }, '%')
					]),
					E('div', { 'class': 'istore-circle-caption' }, _('输出负载率'))
				])
			]),
			E('div', { 'class': 'istore-subdata-grid' }, [
				E('div', { 'class': 'istore-subdata-item' }, [
					E('div', { 'class': 'istore-subdata-k' }, _('实时输出功率')),
					E('div', { 'class': 'istore-subdata-v' }, [
						powerVal !== null ? (powerVal + ' W') : _('未知'),
						powerTag
					])
				]),
				E('div', { 'class': 'istore-subdata-item' }, [
					E('div', { 'class': 'istore-subdata-k' }, _('逆变输出电压')),
					E('div', { 'class': 'istore-subdata-v' }, status && status.output_voltage ? (status.output_voltage + ' V') : _('未知'))
				])
			])
		];
	},

	renderMatrixTiles: function(status) {
		status = status || {};
		return [
			E('div', { 'class': 'istore-mini-tile' }, [
				E('div', { 'class': 'istore-mini-tile-title' }, [_('市电输入电压'), '🔌']),
				E('div', { 'class': 'istore-mini-tile-val' }, status.input_voltage ? (status.input_voltage + ' V') : '--')
			]),
			E('div', { 'class': 'istore-mini-tile' }, [
				E('div', { 'class': 'istore-mini-tile-title' }, [_('逆变输出电压'), '🎯']),
				E('div', { 'class': 'istore-mini-tile-val' }, status.output_voltage ? (status.output_voltage + ' V') : '--')
			]),
			E('div', { 'class': 'istore-mini-tile' }, [
				E('div', { 'class': 'istore-mini-tile-title' }, [_('交流输入工频'), '〰']),
				E('div', { 'class': 'istore-mini-tile-val' }, status.input_freq ? (status.input_freq + ' Hz') : '--')
			]),
			E('div', { 'class': 'istore-mini-tile' }, [
				E('div', { 'class': 'istore-mini-tile-title' }, [_('机内传感温度'), '🌡']),
				E('div', { 'class': 'istore-mini-tile-val' }, status.temperature ? (status.temperature + ' °C') : E('span', { 'style': 'font-size:0.9rem;color:#94a3b8;font-weight:normal;' }, _('不支持')))
			])
		];
	},

	updateDashboard: function(status, logs) {
		status = status || {};
		logs = logs || {};

		var sub = document.getElementById('device-name-sub');
		if (sub && (status.manufacturer || status.model)) {
			sub.innerText = (status.manufacturer || '') + ' ' + (status.model || '');
		}

		var badgeBox = document.getElementById('header-badge-box');
		if (badgeBox) dom.content(badgeBox, this.renderStatusBadge(status));

		var flowBox = document.getElementById('power-flow-strip');
		if (flowBox) dom.content(flowBox, this.renderFlowStrip(status));

		var battCard = document.getElementById('card-gauge-battery');
		if (battCard) dom.content(battCard, this.renderBatteryCard(status));

		var loadCard = document.getElementById('card-gauge-load');
		if (loadCard) dom.content(loadCard, this.renderLoadCard(status));

		var matrixBox = document.getElementById('matrix-tiles-row');
		if (matrixBox) dom.content(matrixBox, this.renderMatrixTiles(status));

		var logPre = document.getElementById('clean-logs-pre');
		if (logPre && logs.logs) {
			logPre.innerText = logs.logs.slice(-15).join('\n');
		}
	}
});
