#!/bin/sh
# Test suite for iStore UPS Manager
# Validates syntax, RPC interfaces, and parsing

set -e

echo "=== 1. Validating Shell Scripts Syntax ==="
for f in root/usr/libexec/rpcd/luci.istore-ups root/usr/bin/istore-ups-daemon root/usr/bin/istore-ups-notify root/usr/bin/istore-ups-shutdown root/etc/init.d/istore-ups; do
    echo -n "Checking $f ... "
    sh -n "$f"
    echo "OK"
done

echo ""
echo "=== 2. Testing RPC list interface ==="
root/usr/libexec/rpcd/luci.istore-ups list

echo ""
echo "=== 3. Testing RPC call scan_devices ==="
root/usr/libexec/rpcd/luci.istore-ups call scan_devices
echo ""

echo ""
echo "=== 4. Testing RPC call diagnose ==="
root/usr/libexec/rpcd/luci.istore-ups call diagnose
echo ""

echo ""
echo "=== All syntax and base RPC checks passed successfully! ==="
