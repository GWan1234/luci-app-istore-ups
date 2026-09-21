#
# Copyright (C) 2026 iStoreOS Team & Contributors
#
# This is free software, licensed under the GNU General Public License v2.
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for iStore UPS Manager
LUCI_DEPENDS:=+luci-base +rpcd +rpcd-mod-file +nut +nut-common +nut-server +nut-upsmon +nut-upsc +nut-driver-usbhid-ups +curl
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-istore-ups
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-or-later
PKG_MAINTAINER:=iStoreOS Team

include $(TOPDIR)/feeds/luci/luci.mk

# Support standalone build when feeds/luci/luci.mk is not directly present in out-of-tree env
$(eval $(call BuildPackage,$(PKG_NAME)))
