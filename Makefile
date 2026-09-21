#
# Copyright (C) 2026 iStoreOS Team & Contributors
#
# This is free software, licensed under the GNU General Public License v2.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-istore-ups
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-or-later
PKG_MAINTAINER:=iStoreOS Team & Contributors

LUCI_TITLE:=LuCI support for iStore UPS Manager
LUCI_DESCRIPTION:=Enterprise UPS Power Management System for iStoreOS / OpenWrt with auto-discovery, telemetry, outage alerts and shutdown protection.
LUCI_DEPENDS:=+luci-base +rpcd +rpcd-mod-file +nut +nut-common +nut-server +nut-upsmon +nut-upsc +nut-driver-usbhid-ups +curl
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/postinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	/etc/uci-defaults/80_istore_ups 2>/dev/null || true
	/etc/init.d/istore-ups enable
	/etc/init.d/istore-ups restart 2>/dev/null || true
	/etc/init.d/rpcd restart 2>/dev/null || true
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache/
fi
exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	/etc/init.d/istore-ups stop 2>/dev/null || true
	/etc/init.d/istore-ups disable 2>/dev/null || true
fi
exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -rf /tmp/run/istore-ups* /tmp/log/istore-ups*
	/etc/init.d/rpcd restart 2>/dev/null || true
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache/
fi
exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# Support standalone build when feeds/luci/luci.mk is not directly present in out-of-tree env
$(eval $(call BuildPackage,$(PKG_NAME)))
