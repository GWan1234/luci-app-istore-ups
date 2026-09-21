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
		return E('span', { 'class': 'istore-na-text' }, fallback || _('不支持'));
	}
	return E('span', { 'class': 'istore-val-text' }, [val + (unit ? ' ' + unit : '')]);
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

		var container = E('div', { 'class': 'cbi-map istore-dashboard-wrap' });

		// Advanced Glassmorphism / Cyberpunk Theme Styling
		var styleNode = E('style', {}, [
			'@keyframes istore-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.15); } }',
			'@keyframes istore-dash { to { stroke-dashoffset: -20; } }',
			'.istore-dashboard-wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif; }',
			'.istore-hero-banner { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); border-radius: 1rem; padding: 1.5rem; color: #f8fafc; margin-bottom: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden; }',
			'.istore-hero-banner::before { content: ""; position: absolute; top: -50%; right: -20%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%); pointer-events: none; }',
			'.istore-header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; }',
			'.istore-brand-box { display: flex; align-items: center; gap: 0.85rem; }',
			'.istore-brand-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #3b82f6, #6366f1); border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 12px rgba(59,130,246,0.4); }',
			'.istore-title { font-size: 1.4rem; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin: 0; display: flex; align-items: center; gap: 0.6rem; }',
			'.istore-subtitle { font-size: 0.85rem; color: #94a3b8; margin: 0.2rem 0 0 0; }',
			'.istore-pill-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; }',
			'.pill-online { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.4); }',
			'.pill-battery { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); }',
			'.pill-danger { background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.5); }',
			'.pill-offline { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }',
			'.istore-dot-pulse { width: 8px; height: 8px; border-radius: 50%; display: inline-block; animation: istore-pulse 2s infinite ease-in-out; }',
			'.dot-green { background: #10b981; box-shadow: 0 0 8px #10b981; }',
			'.dot-amber { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }',
			'.dot-red { background: #ef4444; box-shadow: 0 0 8px #ef4444; }',
			'.dot-gray { background: #94a3b8; }',
			'.istore-topbar-controls { display: flex; align-items: center; gap: 0.75rem; }',
			'.istore-select-pill { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #f8fafc; border-radius: 0.5rem; padding: 0.35rem 0.75rem; font-size: 0.8rem; outline: none; }',
			'.istore-select-pill option { background: #1e293b; color: #fff; }',
			'.istore-topology-card { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 0.85rem; padding: 1.25rem; margin-top: 1rem; }',
			'.istore-main-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }',
			'.istore-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative; }',
			'.dark-mode .istore-card { background: #1e293b; border-color: #334155; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }',
			'.istore-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }',
			'.istore-card-label { font-size: 0.95rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.5rem; }',
			'.dark-mode .istore-card-label { color: #f1f5f9; }',
			'.istore-gauge-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 0.5rem 0; }',
			'.istore-gauge-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }',
			'.istore-gauge-number { font-size: 2.25rem; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }',
			'.dark-mode .istore-gauge-number { color: #f8fafc; }',
			'.istore-gauge-unit { font-size: 1rem; font-weight: 500; color: #64748b; margin-left: 2px; }',
			'.istore-gauge-subtext { font-size: 0.8rem; color: #64748b; margin-top: 0.35rem; font-weight: 500; }',
			'.dark-mode .istore-gauge-subtext { color: #94a3b8; }',
			'.istore-stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #f1f5f9; }',
			'.dark-mode .istore-stats-row { border-top-color: #334155; }',
			'.istore-stat-item { text-align: center; }',
			'.istore-stat-title { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }',
			'.dark-mode .istore-stat-title { color: #94a3b8; }',
			'.istore-stat-value { font-size: 1.15rem; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }',
			'.dark-mode .istore-stat-value { color: #f8fafc; }',
			'.istore-tag-est { background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 6px; }',
			'.istore-tag-real { background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 6px; }',
			'.istore-matrix-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }',
			'.istore-matrix-cell { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }',
			'.dark-mode .istore-matrix-cell { background: #1e293b; border-color: #334155; }',
			'.istore-matrix-title { font-size: 0.8rem; color: #64748b; margin-bottom: 0.35rem; display: flex; align-items: center; justify-content: space-between; }',
			'.istore-matrix-num { font-size: 1.4rem; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }',
			'.dark-mode .istore-matrix-num { color: #f8fafc; }',
			'.istore-na-text { color: #94a3b8; font-style: italic; font-size: 0.9rem; font-weight: normal; }',
			'.istore-terminal-card { background: #0b0f19; border: 1px solid #1e293b; border-radius: 0.85rem; padding: 1.25rem; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }',
			'.istore-terminal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); }'
		]);

		// Hero Header
		var header = E('div', { 'class': 'istore-hero-banner' }, [
			E('div', { 'class': 'istore-header-row' }, [
				E('div', { 'class': 'istore-brand-box' }, [
					E('div', { 'class': 'istore-brand-icon' }, '⚡'),
					E('div', {}, [
						E('h2', { 'class': 'istore-title' }, [
							_('iStore UPS Manager'),
							E('span', { 'style': 'font-size:0.75rem;background:rgba(59,130,246,0.3);padding:2px 8px;border-radius:4px;border:1px solid rgba(59,130,246,0.5);' }, 'v1.0.0')
						]),
						E('p', { 'class': 'istore-subtitle', 'id': 'hero-device-desc' },
							(status.manufacturer || status.model) ? (status.manufacturer + ' — ' + status.model) : _('正在通过 NUT 协议读取设备...')
						)
					])
				]),
				E('div', { 'class': 'istore-topbar-controls' }, [
					E('div', { 'id': 'hero-badge-container' }, self.renderHeroBadge(status)),
					E('select', {
						'class': 'istore-select-pill',
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
						E('option', { 'value': '1' }, _('⚡ 1秒 高频')),
						E('option', { 'value': '2' }, _('2秒')),
						E('option', { 'value': '3', 'selected': 'selected' }, _('3秒 实时')),
						E('option', { 'value': '5' }, _('5秒')),
						E('option', { 'value': '10' }, _('10秒 节能')),
						E('option', { 'value': '0' }, _('⏸ 暂停刷新'))
					])
				])
			]),

			// Animated Power Flow Topology
			E('div', { 'class': 'istore-topology-card', 'id': 'topology-container' }, self.renderTopology(status))
		]);

		// Main Dual Gauge Grid
		var mainGrid = E('div', { 'class': 'istore-main-grid' }, [
			// 1. Battery Gauge Card
			E('div', { 'class': 'istore-card', 'id': 'gauge-card-battery' }, self.renderBatteryGauge(status)),

			// 2. Load & Power Gauge Card
			E('div', { 'class': 'istore-card', 'id': 'gauge-card-load' }, self.renderLoadGauge(status))
		]);

		// Matrix 4-Cards Grid
		var matrixGrid = E('div', { 'class': 'istore-matrix-grid', 'id': 'matrix-grid-container' },
			self.renderMatrixCards(status)
		);

		// Event Log Terminal
		var terminal = E('div', { 'class': 'istore-terminal-card' }, [
			E('div', { 'class': 'istore-terminal-head' }, [
				E('div', { 'style': 'font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;' }, [
					E('span', { 'style': 'width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;' }),
					_('系统事件与电源状态流水 (Events Log)')
				]),
				E('div', { 'style': 'font-size:0.75rem;color:#64748b;' }, _('内存环形缓存 · 自动滚动'))
			]),
			E('pre', {
				'id': 'terminal-logs-pre',
				'style': 'margin:0;max-height:180px;overflow-y:auto;font-size:0.8rem;line-height:1.6;color:#cbd5e1;'
			}, (logs.logs && logs.logs.length) ? logs.logs.slice(-15).join('\n') : _('暂无事件记录'))
		]);

		dom.append(container, [styleNode, header, mainGrid, matrixGrid, terminal]);

		// Register polling
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

	renderHeroBadge: function(status) {
		if (!status || !status.connected) {
			return E('div', { 'class': 'istore-pill-badge pill-offline' }, [
				E('span', { 'class': 'istore-dot-pulse dot-gray' }),
				_('通信未就绪 / 离线')
			]);
		}

		if (status.is_low_battery) {
			return E('div', { 'class': 'istore-pill-badge pill-danger' }, [
				E('span', { 'class': 'istore-dot-pulse dot-red' }),
				_('电池严重告急 (LOW BATTERY)')
			]);
		}

		if (status.is_on_battery) {
			return E('div', { 'class': 'istore-pill-badge pill-battery' }, [
				E('span', { 'class': 'istore-dot-pulse dot-amber' }),
				_('市电中断 · 电池供电中')
			]);
		}

		if (status.is_online) {
			return E('div', { 'class': 'istore-pill-badge pill-online' }, [
				E('span', { 'class': 'istore-dot-pulse dot-green' }),
				_('市电供电正常 (ONLINE)')
			]);
		}

		return E('div', { 'class': 'istore-pill-badge pill-offline' }, status.status || _('待机中'));
	},

	renderTopology: function(status) {
		var isOnline = status && status.is_online;
		var isBattery = status && status.is_on_battery;

		var gridColor = isOnline ? '#10b981' : '#ef4444';
		var gridText = isOnline ? _('市电正常 (220V)') : _('电网中断 (0V)');
		var upsStatusText = isBattery ? _('逆变供电中') : _('旁路 / 滤波稳压');
		var loadWatts = (status && status.power !== null && status.power !== undefined) ? (status.power + ' W') : (status && status.load_percent ? (status.load_percent + '%') : 'LOAD');

		var dashAnim = isOnline ? 'animation: istore-dash 1s linear infinite;' : 'stroke-dasharray: 4,4; opacity: 0.3;';
		var battAnim = isBattery ? 'animation: istore-dash 1s linear infinite;' : 'stroke-dasharray: 4,4; opacity: 0.4;';

		var svg = [
			'<svg viewBox="0 0 760 110" style="width:100%;max-height:110px;overflow:visible;">',
			'<defs>',
			'  <linearGradient id="gradGrid" x1="0%" y1="0%" x2="100%" y2="0%">',
			'    <stop offset="0%" stop-color="' + gridColor + '" stop-opacity="0.8"/>',
			'    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.8"/>',
			'  </linearGradient>',
			'  <linearGradient id="gradBatt" x1="0%" y1="100%" x2="0%" y2="0%">',
			'    <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8"/>',
			'    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.8"/>',
			'  </linearGradient>',
			'</defs>',

			// Path Grid -> UPS
			'<path d="M 120 40 L 320 40" fill="none" stroke="' + (isOnline ? 'url(#gradGrid)' : '#475569') + '" stroke-width="3" stroke-dasharray="6,4" style="' + dashAnim + '" />',

			// Path UPS -> Load
			'<path d="M 440 40 L 640 40" fill="none" stroke="url(#gradGrid)" stroke-width="3" stroke-dasharray="6,4" style="animation: istore-dash 1s linear infinite;" />',

			// Path Battery -> UPS
			'<path d="M 380 90 L 380 58" fill="none" stroke="' + (isBattery ? 'url(#gradBatt)' : '#334155') + '" stroke-width="3" stroke-dasharray="6,4" style="' + battAnim + '" />',

			// Grid Node
			'<rect x="20" y="15" width="100" height="50" rx="8" fill="#1e293b" stroke="' + gridColor + '" stroke-width="1.5" />',
			'<text x="70" y="37" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">🔌 ' + _('市电电网') + '</text>',
			'<text x="70" y="53" fill="' + gridColor + '" font-size="10" text-anchor="middle">' + gridText + '</text>',

			// UPS Core Node
			'<rect x="320" y="10" width="120" height="60" rx="10" fill="#1e293b" stroke="#3b82f6" stroke-width="2" />',
			'<text x="380" y="35" fill="#f8fafc" font-size="13" font-weight="900" text-anchor="middle">⚡ ' + _('UPS 主机') + '</text>',
			'<text x="380" y="53" fill="#93c5fd" font-size="10" text-anchor="middle">' + upsStatusText + '</text>',

			// Load Node
			'<rect x="640" y="15" width="100" height="50" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />',
			'<text x="690" y="37" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">💻 ' + _('后端负载') + '</text>',
			'<text x="690" y="53" fill="#34d399" font-size="10" font-weight="bold" text-anchor="middle">' + loadWatts + '</text>',

			// Battery Node (Bottom)
			'<rect x="330" y="80" width="100" height="28" rx="6" fill="#1e293b" stroke="' + (isBattery ? '#f59e0b' : '#475569') + '" stroke-width="1.5" />',
			'<text x="380" y="98" fill="' + (isBattery ? '#fbbf24' : '#94a3b8') + '" font-size="11" font-weight="bold" text-anchor="middle">🔋 ' + _('蓄电池组') + '</text>',

			'</svg>'
		];

		var wrapper = E('div', {});
		wrapper.innerHTML = svg.join('');
		return wrapper;
	},

	renderRadialProgress: function(percent, strokeColor, radius) {
		radius = radius || 68;
		var stroke = 12;
		var normalizedRadius = radius - stroke * 2;
		var circumference = normalizedRadius * 2 * Math.PI;
		var strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent || 0)) / 100) * circumference;

		return [
			'<svg height="' + (radius * 2) + '" width="' + (radius * 2) + '" style="transform: rotate(-90deg);overflow:visible;">',
			'<circle stroke="rgba(148, 163, 184, 0.15)" fill="transparent" stroke-width="' + stroke + '" r="' + normalizedRadius + '" cx="' + radius + '" cy="' + radius + '" />',
			'<circle stroke="' + strokeColor + '" fill="transparent" stroke-width="' + stroke + '" stroke-dasharray="' + circumference + ' ' + circumference + '" style="stroke-dashoffset: ' + strokeDashoffset + '; transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease;" stroke-linecap="round" r="' + normalizedRadius + '" cx="' + radius + '" cy="' + radius + '" />',
			'</svg>'
		].join('');
	},

	renderBatteryGauge: function(status) {
		var charge = (status && status.battery_charge !== null) ? status.battery_charge : null;
		var color = '#10b981';
		if (charge !== null && charge <= 20) color = '#ef4444';
		else if (charge !== null && charge <= 50) color = '#f59e0b';

		var runtimeText = formatRuntime(status ? status.battery_runtime : null);
		var voltageText = status && status.battery_voltage ? (status.battery_voltage + ' V') : _('未知');

		return [
			E('div', { 'class': 'istore-card-head' }, [
				E('div', { 'class': 'istore-card-label' }, ['🔋 ', _('蓄电池组荷电状态 (Battery State)')]),
				E('span', { 'style': 'font-size:0.8rem;color:#64748b;' }, status && status.is_on_battery ? _('放电中') : _('浮充/维持'))
			]),
			E('div', { 'class': 'istore-gauge-wrap' }, [
				(function() {
					var node = E('div', {});
					node.innerHTML = this.renderRadialProgress(charge !== null ? charge : 0, color, 74);
					return node;
				}).call(this),
				E('div', { 'class': 'istore-gauge-center' }, [
					E('div', { 'class': 'istore-gauge-number' }, [
						charge !== null ? charge : '--',
						E('span', { 'class': 'istore-gauge-unit' }, '%')
					]),
					E('div', { 'class': 'istore-gauge-subtext' }, _('剩余可用电量'))
				])
			]),
			E('div', { 'class': 'istore-stats-row' }, [
				E('div', { 'class': 'istore-stat-item' }, [
					E('div', { 'class': 'istore-stat-title' }, _('预估放电续航')),
					E('div', { 'class': 'istore-stat-value', 'style': 'color:#2563eb;' }, runtimeText)
				]),
				E('div', { 'class': 'istore-stat-item' }, [
					E('div', { 'class': 'istore-stat-title' }, _('电池端母线电压')),
					E('div', { 'class': 'istore-stat-value' }, voltageText)
				])
			])
		];
	},

	renderLoadGauge: function(status) {
		var load = (status && status.load_percent !== null) ? status.load_percent : null;
		var color = '#3b82f6';
		if (load !== null && load >= 80) color = '#ef4444';
		else if (load !== null && load >= 60) color = '#f59e0b';

		var powerVal = (status && status.power !== null && status.power !== undefined) ? status.power : null;
		var powerTag = null;
		if (powerVal !== null) {
			if (status.power_is_estimated) {
				powerTag = E('span', { 'class': 'istore-tag-est', 'title': _('此 UPS 无独立 realpower 硬件传感器，由额定功率×负载率计算') }, _('软件估算'));
			} else {
				powerTag = E('span', { 'class': 'istore-tag-real' }, _('实测功率'));
			}
		}

		return [
			E('div', { 'class': 'istore-card-head' }, [
				E('div', { 'class': 'istore-card-label' }, ['⚡ ', _('逆变负载与输出功率 (Load & Power)')]),
				E('span', { 'style': 'font-size:0.8rem;color:#64748b;' }, _('额定负荷比例'))
			]),
			E('div', { 'class': 'istore-gauge-wrap' }, [
				(function() {
					var node = E('div', {});
					node.innerHTML = this.renderRadialProgress(load !== null ? load : 0, color, 74);
					return node;
				}).call(this),
				E('div', { 'class': 'istore-gauge-center' }, [
					E('div', { 'class': 'istore-gauge-number' }, [
						load !== null ? load : '--',
						E('span', { 'class': 'istore-gauge-unit' }, '%')
					]),
					E('div', { 'class': 'istore-gauge-subtext' }, _('当前负载率'))
				])
			]),
			E('div', { 'class': 'istore-stats-row' }, [
				E('div', { 'class': 'istore-stat-item' }, [
					E('div', { 'class': 'istore-stat-title' }, _('输出有功功率')),
					E('div', { 'class': 'istore-stat-value', 'style': 'display:flex;align-items:center;justify-content:center;' }, [
						powerVal !== null ? (powerVal + ' W') : _('未知'),
						powerTag
					])
				]),
				E('div', { 'class': 'istore-stat-item' }, [
					E('div', { 'class': 'istore-stat-title' }, _('逆变输出电压')),
					E('div', { 'class': 'istore-stat-value' }, status && status.output_voltage ? (status.output_voltage + ' V') : _('未知'))
				])
			])
		];
	},

	renderMatrixCards: function(status) {
		status = status || {};
		return [
			E('div', { 'class': 'istore-matrix-cell' }, [
				E('div', { 'class': 'istore-matrix-title' }, [_('市电输入电压'), '🔌']),
				E('div', { 'class': 'istore-matrix-num' }, status.input_voltage ? (status.input_voltage + ' V') : '--'),
				E('div', { 'style': 'font-size:0.75rem;color:#64748b;margin-top:0.25rem;' }, _('电网交流有效值'))
			]),
			E('div', { 'class': 'istore-matrix-cell' }, [
				E('div', { 'class': 'istore-matrix-title' }, [_('逆变输出电压'), '🎯']),
				E('div', { 'class': 'istore-matrix-num' }, status.output_voltage ? (status.output_voltage + ' V') : '--'),
				E('div', { 'style': 'font-size:0.75rem;color:#64748b;margin-top:0.25rem;' }, _('供给负载端电压'))
			]),
			E('div', { 'class': 'istore-matrix-cell' }, [
				E('div', { 'class': 'istore-matrix-title' }, [_('交流输入工频'), '〰']),
				E('div', { 'class': 'istore-matrix-num' }, status.input_freq ? (status.input_freq + ' Hz') : '--'),
				E('div', { 'style': 'font-size:0.75rem;color:#64748b;margin-top:0.25rem;' }, _('标称工频 50.0 Hz'))
			]),
			E('div', { 'class': 'istore-matrix-cell' }, [
				E('div', { 'class': 'istore-matrix-title' }, [_('机内传感温度'), '🌡']),
				E('div', { 'class': 'istore-matrix-num' }, status.temperature ? (status.temperature + ' °C') : E('span', { 'class': 'istore-na-text' }, _('不支持'))),
				E('div', { 'style': 'font-size:0.75rem;color:#64748b;margin-top:0.25rem;' }, _('硬件测温传感器'))
			])
		];
	},

	updateDashboard: function(status, logs) {
		status = status || {};
		logs = logs || {};

		var badgeBox = document.getElementById('hero-badge-container');
		if (badgeBox) dom.content(badgeBox, this.renderHeroBadge(status));

		var descBox = document.getElementById('hero-device-desc');
		if (descBox && (status.manufacturer || status.model)) {
			descBox.innerText = (status.manufacturer || '') + ' — ' + (status.model || '');
		}

		var topoBox = document.getElementById('topology-container');
		if (topoBox) dom.content(topoBox, this.renderTopology(status));

		var battCard = document.getElementById('gauge-card-battery');
		if (battCard) dom.content(battCard, this.renderBatteryGauge(status));

		var loadCard = document.getElementById('gauge-card-load');
		if (loadCard) dom.content(loadCard, this.renderLoadGauge(status));

		var matrixBox = document.getElementById('matrix-grid-container');
		if (matrixBox) dom.content(matrixBox, this.renderMatrixCards(status));

		var logPre = document.getElementById('terminal-logs-pre');
		if (logPre && logs.logs) {
			logPre.innerText = logs.logs.slice(-15).join('\n');
		}
	}
});
