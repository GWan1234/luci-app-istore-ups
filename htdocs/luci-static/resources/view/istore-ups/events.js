'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetOpsEvents = rpc.declare({
	object: 'luci.istore-ups',
	method: 'get_ops_events',
	expect: { '': {} }
});

var callClearOpsEvents = rpc.declare({
	object: 'luci.istore-ups',
	method: 'clear_ops_events',
	expect: { '': {} }
});

return view.extend({
	filterType: 'all',
	events: [],

	load: function() {
		return callGetOpsEvents().catch(function() {
			return { total: 0, events: [] };
		});
	},

	render: function(data) {
		var self = this;
		this.events = (data && data.events) ? data.events : [];

		var container = E('div', { 'class': 'cbi-map istore-events-view' });

		var styleNode = E('style', {}, [
			'.istore-events-view { max-width: 1280px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Helvetica Neue", Arial, sans-serif; color: #1e293b; }',
			'.dark-mode .istore-events-view { color: #f8fafc; }',
			'.event-panel-card { background: var(--cbi-section-background, #ffffff); border: 1px solid var(--cbi-section-border, #e2e8f0); border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }',
			'.dark-mode .event-panel-card { background: #1e293b; border-color: #334155; }',
			'.event-top-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }',
			'.event-title-wrap { display: flex; align-items: center; gap: 0.6rem; }',
			'.event-main-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 0.45rem; }',
			'.dark-mode .event-main-title { color: #f8fafc; }',
			'.event-count-badge { font-size: 0.85rem; color: #64748b; font-weight: 500; }',
			'.dark-mode .event-count-badge { color: #94a3b8; }',
			'.event-actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }',
			'.event-filter-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.82rem; background: #ffffff; color: inherit; }',
			'.dark-mode .event-filter-select { background: #0f172a; border-color: #475569; }',
			'.event-btn-light { border: 1px solid #e2e8f0; background: #ffffff; color: #334155; border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 500; transition: all 0.2s; }',
			'.event-btn-light:hover { background: #f8fafc; border-color: #cbd5e1; }',
			'.dark-mode .event-btn-light { background: #1e293b; border-color: #334155; color: #f8fafc; }',
			'.dark-mode .event-btn-light:hover { background: #334155; }',
			'.event-notice-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 1rem 1.25rem; margin: 1.15rem 0 1.25rem 0; font-size: 0.82rem; color: #1e293b; }',
			'.dark-mode .event-notice-box { background: #1e3a8a25; border-color: #1e40af; color: #e2e8f0; }',
			'.event-notice-title { font-weight: 700; color: #1d4ed8; font-size: 0.9rem; margin-bottom: 0.45rem; display: flex; align-items: center; gap: 0.4rem; }',
			'.dark-mode .event-notice-title { color: #60a5fa; }',
			'.event-notice-p { margin: 0.3rem 0; line-height: 1.6; color: #334155; }',
			'.dark-mode .event-notice-p { color: #94a3b8; }',
			'.event-row-card { background: #ffffff; border: 1px solid #f1f5f9; border-radius: 8px; padding: 0.9rem 1.25rem; margin-bottom: 0.75rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: transform 0.15s, box-shadow 0.15s; }',
			'.dark-mode .event-row-card { background: #1e293b; border-color: #334155; }',
			'.event-row-card:hover { transform: translateY(-1px); box-shadow: 0 3px 6px rgba(0,0,0,0.04); }',
			'.event-row-card.border-red { border-left: 4px solid #ef4444; }',
			'.event-row-card.border-green { border-left: 4px solid #10b981; }',
			'.event-row-card.border-blue { border-left: 4px solid #3b82f6; }',
			'.event-row-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem; }',
			'.event-row-header-left { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }',
			'.event-tag-pill { display: inline-flex; align-items: center; gap: 0.25rem; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }',
			'.event-tag-red { background: #fee2e2; color: #dc2626; }',
			'.event-tag-green { background: #d1fae5; color: #059669; }',
			'.event-tag-blue { background: #f1f5f9; color: #475569; }',
			'.dark-mode .event-tag-blue { background: #334155; color: #94a3b8; }',
			'.event-row-title { font-size: 0.92rem; font-weight: 700; color: #0f172a; }',
			'.dark-mode .event-row-title { color: #f8fafc; }',
			'.event-row-time { font-family: monospace; font-size: 0.78rem; color: #94a3b8; }',
			'.event-row-desc { font-size: 0.83rem; color: #64748b; margin: 0; line-height: 1.55; }',
			'.dark-mode .event-row-desc { color: #94a3b8; }'
		]);

		container.appendChild(styleNode);

		var panelCard = E('div', { 'class': 'event-panel-card' });

		// Top Action Bar
		var titleNode = E('div', { 'class': 'event-title-wrap' }, [
			E('h2', { 'class': 'event-main-title' }, ['⏱️ ', _('UPS 事件历史与运维日志')]),
			E('span', { 'class': 'event-count-badge', 'id': 'events-count-label' }, (this.events.length) + _(' 条记录'))
		]);

		var filterSelect = E('select', {
			'class': 'event-filter-select',
			'change': function(ev) {
				self.filterType = ev.target.value;
				self.updateEventList();
			}
		}, [
			E('option', { 'value': 'all' }, _('🔍 全部事件类型')),
			E('option', { 'value': 'power' }, _('⚡ 供电事件')),
			E('option', { 'value': 'comm' }, _('🔌 串口/协议')),
			E('option', { 'value': 'ops' }, _('⚙️ 系统运维'))
		]);

		var refreshBtn = E('button', {
			'class': 'event-btn-light',
			'click': function() {
				return self.refresh();
			}
		}, ['🔄 ', _('刷新')]);

		var clearBtn = E('button', {
			'class': 'event-btn-light',
			'click': function() {
				if (!confirm(_('确定清空所有 UPS 运维事件与历史记录吗？'))) return;
				callClearOpsEvents().then(function() {
					self.events = [];
					self.updateEventList();
					ui.addNotification(null, E('p', {}, _('日志已成功清空。')), 'info');
				});
			}
		}, ['🗑️ ', _('清空日志')]);

		var actionsNode = E('div', { 'class': 'event-actions' }, [
			filterSelect,
			refreshBtn,
			clearBtn
		]);

		var topBar = E('div', { 'class': 'event-top-bar' }, [
			titleNode,
			actionsNode
		]);

		panelCard.appendChild(topBar);

		// Notice / Explanation Box (100% Matching Screenshot)
		var noticeBox = E('div', { 'class': 'event-notice-box' }, [
			E('div', { 'class': 'event-notice-title' }, [
				'ℹ️ 💡 ',
				_('为什么断电恢复后空载待机功耗回到 ~50W？')
			]),
			E('p', { 'class': 'event-notice-p' }, _('1. 在线双变换默认启动: 山特 Castle 1K 断电恢复市电后，默认启动整流器与逆变全桥，高压母线升至 350V+ 维持 220V 纯正弦波输出，产生 ~50W 固有待机功耗。')),
			E('p', { 'class': 'event-notice-p' }, _('2. 充电机大电流补电: 断电期间电池放电后，市电恢复时内部充电机会启动恒流大电流充电（充电自耗约 30~50W），充饱转入恒压浮充后功耗才会回落。')),
			E('p', { 'class': 'event-notice-p' }, _('3. ECO 节能模式: 若要将待机功耗降至 25~30W，可开启 ECO 模式，市电正常时通过旁路高效率滤波直通，市电异常 2~4ms 自动切电池逆变。'))
		]);

		panelCard.appendChild(noticeBox);

		// Events List Container
		var listContainer = E('div', { 'id': 'events-timeline-container' }, this.renderEventItems());
		panelCard.appendChild(listContainer);

		container.appendChild(panelCard);
		return container;
	},

	renderEventItems: function() {
		var self = this;
		var filtered = this.events.filter(function(ev) {
			if (self.filterType === 'all') return true;
			return ev.category === self.filterType;
		});

		if (filtered.length === 0) {
			return [
				E('div', { 'style': 'text-align:center;padding:3rem 0;color:#94a3b8;font-size:0.9rem;' }, _('暂无匹配的事件日志记录'))
			];
		}

		var items = [];
		filtered.forEach(function(ev) {
			var cardClass = 'event-row-card';
			var tagNode = null;

			if (ev.category === 'comm') {
				cardClass += ' border-red';
				tagNode = E('span', { 'class': 'event-tag-pill event-tag-red' }, ['🔴 ⚡ ', _('串口/协议')]);
			} else if (ev.category === 'power') {
				if (ev.level === 'warn') {
					cardClass += ' border-red';
					tagNode = E('span', { 'class': 'event-tag-pill event-tag-red' }, ['🔴 ⚡ ', _('供电事件')]);
				} else {
					cardClass += ' border-green';
					tagNode = E('span', { 'class': 'event-tag-pill event-tag-green' }, ['🟢 ⚡ ', _('供电事件')]);
				}
			} else {
				cardClass += ' border-blue';
				tagNode = E('span', { 'class': 'event-tag-pill event-tag-blue' }, ['ℹ️ ', _('系统运维')]);
			}

			var itemNode = E('div', { 'class': cardClass }, [
				E('div', { 'class': 'event-row-header' }, [
					E('div', { 'class': 'event-row-header-left' }, [
						tagNode,
						E('span', { 'class': 'event-row-title' }, ev.title)
					]),
					E('span', { 'class': 'event-row-time' }, ev.time || '')
				]),
				E('p', { 'class': 'event-row-desc' }, ev.desc)
			]);

			items.push(itemNode);
		});

		return items;
	},

	updateEventList: function() {
		var container = document.getElementById('events-timeline-container');
		if (container) {
			dom.content(container, this.renderEventItems());
		}
		var label = document.getElementById('events-count-label');
		if (label) {
			label.innerText = this.events.length + _(' 条记录');
		}
	},

	refresh: function() {
		var self = this;
		return callGetOpsEvents().then(function(res) {
			self.events = (res && res.events) ? res.events : [];
			self.updateEventList();
			ui.addNotification(null, E('p', {}, _('事件与运维日志已刷新')), 'info');
		});
	}
});
