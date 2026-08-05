
# ssh 传输到树莓派速度

128G SD卡
2.35G 需要4分30秒, ssh传输差不多9mb/s

128G U盘 (USB 3.0 360MB/s)
2.35G 需要35秒, ssh传输差不多68.7mb/s

# Nginx 开机自动启动设置

```shell
启用Nginx开机启动：
sudo systemctl enable nginx

禁用Nginx开机启动：
sudo systemctl disable nginx

验证是否禁用成功：
sudo systemctl is-enabled nginx
如果显示 enabled，表示已成功启用开机启动。
如果显示 disabled，表示已成功关闭开机启动。
```

