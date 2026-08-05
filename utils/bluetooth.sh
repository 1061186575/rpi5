#!/bin/bash
# 断开设备
bluetoothctl disconnect CC:14:BC:B4:F7:B1
sleep 1
# 重新连接设备
bluetoothctl connect CC:14:BC:B4:F7:B1
