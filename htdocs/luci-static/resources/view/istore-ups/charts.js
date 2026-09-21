'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetHistory = rpc.declare({
	object: 'luci.istore-ups',
	method: 'get_history',
	expect: { '': {} }
});

function formatTime(ts) {
	var d = new Date(ts * 1000);
	var h = ('0' + d.getHours()).slice(-2);
	var m = ('0' + d.getMinutes()).slice(-2);
	var s = ('0' + d.getSeconds()).slice(-2);
	return h + ':' + m + ':' + s;
}

return view.extend({
	timeRangeHours: 1,
	historyData: [],

	load: function() {
		return callGetHistory();
	},

	render: function(res) {
		var self = this;
		self.historyData = (res && res.points) ? res.points : [];

		var container = E('div', { 'class': 'cbi-map' }, [
			E('h2', { 'class': 'cbi-map-title' }, _('历史数据曲线与可视化')),
			E('div', { 'class': 'cbi-map-descr' }, _('查看电网输入电压、逆变输出电压、负载率及电池电量的历史时序曲线。市电中断事件以红色断电标识标注。高频数据保存在内存环形缓冲区，无闪存磨损。'))
		]);

		// Toolbar for time filter & export
		var toolbar = E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;' }, [
			E('div', { 'style': 'display:flex;gap:0.5rem;align-items:center;' }, [
				E('span', { 'style': 'font-weight:600;font-size:0.9rem;' }, _('时间范围:')),
				E('button', {
					'class': 'cbi-button ' + (self.timeRangeHours === 1 ? 'cbi-button-apply' : 'cbi-button-neutral'),
					'click': function() { self.changeRange(1, this); }
				}, _('最近 1 小时')),
				E('button', {
					'class': 'cbi-button ' + (self.timeRangeHours === 6 ? 'cbi-button-apply' : 'cbi-button-neutral'),
					'click': function() { self.changeRange(6, this); }
				}, _('最近 6 小时')),
				E('button', {
					'class': 'cbi-button ' + (self.timeRangeHours === 24 ? 'cbi-button-apply' : 'cbi-button-neutral'),
					'click': function() { self.changeRange(24, this); }
				}, _('最近 24 小时'))
			]),
			E('div', { 'style': 'display:flex;gap:0.5rem;' }, [
				E('button', {
					'class': 'cbi-button cbi-button-neutral',
					'click': function() { self.exportCSV(); }
				}, _('导出数据 (CSV)')),
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'click': function() { self.refreshData(); }
				}, _('刷新数据'))
			])
		]);

		// Chart container cards
		var chartCard1 = E('div', { 'class': 'cbi-section', 'style': 'background:#ffffff;border:1px solid #e2e8f0;border-radius:0.75rem;padding:1rem;margin-bottom:1.5rem;' }, [
			E('h3', { 'class': 'cbi-section-title', 'style': 'margin-top:0;font-size:1rem;display:flex;justify-content:space-between;' }, [
				E('span', {}, _('输入电压与输出电压 (V)')),
				E('span', { 'style': 'font-size:0.8rem;color:#64748b;' }, [
					E('span', { 'style': 'color:#3b82f6;font-weight:bold;' }, '— ' + _('输入电压') + '  '),
					E('span', { 'style': 'color:#10b981;font-weight:bold;' }, '— ' + _('输出电压'))
				])
			]),
			E('div', { 'id': 'chart-voltage-container', 'style': 'width:100%;height:220px;' })
		]);

		var chartCard2 = E('div', { 'class': 'cbi-section', 'style': 'background:#ffffff;border:1px solid #e2e8f0;border-radius:0.75rem;padding:1rem;margin-bottom:1.5rem;' }, [
			E('h3', { 'class': 'cbi-section-title', 'style': 'margin-top:0;font-size:1rem;display:flex;justify-content:space-between;' }, [
				E('span', {}, _('电池电量与输出负载率 (%)')),
				E('span', { 'style': 'font-size:0.8rem;color:#64748b;' }, [
					E('span', { 'style': 'color:#10b981;font-weight:bold;' }, '— ' + _('电池电量(%)') + '  '),
					E('span', { 'style': 'color:#f59e0b;font-weight:bold;' }, '— ' + _('负载率(%)'))
				])
			]),
			E('div', { 'id': 'chart-load-container', 'style': 'width:100%;height:220px;' })
		]);

		dom.append(container, [toolbar, chartCard1, chartCard2]);

		// Initial draw after DOM rendered
		window.setTimeout(function() {
			self.drawCharts();
		}, 100);

		return container;
	},

	changeRange: function(hours, btn) {
		this.timeRangeHours = hours;
		var parent = btn.parentElement;
		var btns = parent.querySelectorAll('button');
		btns.forEach(function(b) {
			b.className = 'cbi-button cbi-button-neutral';
		});
		btn.className = 'cbi-button cbi-button-apply';
		this.drawCharts();
	},

	refreshData: function() {
		var self = this;
		return callGetHistory().then(function(res) {
			self.historyData = (res && res.points) ? res.points : [];
			self.drawCharts();
			ui.addNotification(null, E('p', {}, _('历史数据已刷新')), 'info');
		});
	},

	filterPoints: function() {
		if (!this.historyData || this.historyData.length === 0) return [];
		var now = Math.floor(Date.now() / 1000);
		var cutoff = now - (this.timeRangeHours * 3600);
		return this.historyData.filter(function(p) {
			return p.t >= cutoff;
		});
	},

	renderSvgLineChart: function(points, keys, colors, yMin, yMax) {
		var width = 800;
		var height = 200;
		var padding = { top: 20, right: 30, bottom: 30, left: 45 };
		var chartW = width - padding.left - padding.right;
		var chartH = height - padding.top - padding.bottom;

		if (!points || points.length < 2) {
			return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;height:100%;">' +
				'<text x="' + (width/2) + '" y="' + (height/2) + '" text-anchor="middle" fill="#94a3b8">' +
				_('数据采集中，请等待足够的时间采样点积累...') + '</text></svg>';
		}

		var tMin = points[0].t;
		var tMax = points[points.length - 1].t;
		if (tMax <= tMin) tMax = tMin + 1;

		var getX = function(t) {
			return padding.left + ((t - tMin) / (tMax - tMin)) * chartW;
		};
		var getY = function(val) {
			var clamped = Math.max(yMin, Math.min(yMax, val));
			return padding.top + chartH - ((clamped - yMin) / (yMax - yMin)) * chartH;
		};

		var svg = ['<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;height:100%;overflow:visible;">'];

		// Grid lines
		svg.push('<line x1="' + padding.left + '" y1="' + padding.top + '" x2="' + (padding.left + chartW) + '" y2="' + padding.top + '" stroke="#e2e8f0" stroke-dasharray="3,3" />');
		svg.push('<line x1="' + padding.left + '" y1="' + (padding.top + chartH/2) + '" x2="' + (padding.left + chartW) + '" y2="' + (padding.top + chartH/2) + '" stroke="#e2e8f0" stroke-dasharray="3,3" />');
		svg.push('<line x1="' + padding.left + '" y1="' + (padding.top + chartH) + '" x2="' + (padding.left + chartW) + '" y2="' + (padding.top + chartH) + '" stroke="#cbd5e1" />');

		// Y-axis labels
		svg.push('<text x="' + (padding.left - 8) + '" y="' + (padding.top + 5) + '" font-size="11" text-anchor="end" fill="#64748b">' + yMax + '</text>');
		svg.push('<text x="' + (padding.left - 8) + '" y="' + (padding.top + chartH/2 + 4) + '" font-size="11" text-anchor="end" fill="#64748b">' + Math.round((yMax+yMin)/2) + '</text>');
		svg.push('<text x="' + (padding.left - 8) + '" y="' + (padding.top + chartH) + '" font-size="11" text-anchor="end" fill="#64748b">' + yMin + '</text>');

		// Time labels
		svg.push('<text x="' + padding.left + '" y="' + (height - 5) + '" font-size="11" fill="#64748b">' + formatTime(tMin) + '</text>');
		svg.push('<text x="' + (padding.left + chartW) + '" y="' + (height - 5) + '" font-size="11" text-anchor="end" fill="#64748b">' + formatTime(tMax) + '</text>');

		// Highlight power outages (ob == 1)
		for (var i = 0; i < points.length; i++) {
			if (points[i].ob === 1) {
				var x = getX(points[i].t);
				svg.push('<line x1="' + x + '" y1="' + padding.top + '" x2="' + x + '" y2="' + (padding.top + chartH) + '" stroke="#ef4444" stroke-width="2" opacity="0.6" />');
			}
		}

		// Draw series
		for (var k = 0; k < keys.length; k++) {
			var key = keys[k];
			var color = colors[k];
			var pathD = [];
			for (var p = 0; p < points.length; p++) {
				var val = points[p][key] !== undefined ? points[p][key] : 0;
				var ptX = getX(points[p].t).toFixed(1);
				var ptY = getY(val).toFixed(1);
				pathD.push((p === 0 ? 'M' : 'L') + ptX + ',' + ptY);
			}
			svg.push('<path d="' + pathD.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" />');
		}

		svg.push('</svg>');
		return svg.join('');
	},

	drawCharts: function() {
		var points = this.filterPoints();

		var c1 = document.getElementById('chart-voltage-container');
		if (c1) {
			c1.innerHTML = this.renderSvgLineChart(points, ['v', 'vo'], ['#3b82f6', '#10b981'], 180, 260);
		}

		var c2 = document.getElementById('chart-load-container');
		if (c2) {
			c2.innerHTML = this.renderSvgLineChart(points, ['c', 'l'], ['#10b981', '#f59e0b'], 0, 100);
		}
	},

	exportCSV: function() {
		var points = this.historyData || [];
		if (points.length === 0) {
			ui.addNotification(null, E('p', {}, _('当前无历史数据可导出')), 'warning');
			return;
		}

		var lines = ['Timestamp,DateTime,InputVoltage(V),OutputVoltage(V),BatteryCharge(%),LoadPercent(%),Power(W),OnBattery'];
		for (var i = 0; i < points.length; i++) {
			var p = points[i];
			var dt = new Date(p.t * 1000).toISOString();
			lines.push([p.t, dt, p.v || 0, p.vo || 0, p.c || 0, p.l || 0, p.p || 0, p.ob || 0].join(','));
		}

		var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = 'istore_ups_history_' + Math.floor(Date.now() / 1000) + '.csv';
		a.click();
		URL.revokeObjectURL(url);
	}
});
