#!/bin/bash

while true; do
    # 获取当前北京时间
    current_hour=$(TZ='Asia/Shanghai' date +%H)
    current_minute=$(TZ='Asia/Shanghai' date +%M)
    if [ "$current_hour" = "09" ] && [ "$current_minute" = "00" ]; then
        echo "现在是北京时间 9:00, 开始执行程序..."
        node index.js
        break
    else
        echo "等待中... 当前北京时间: $(TZ='Asia/Shanghai' date '+%H:%M:%S')"
        sleep 30  # 每30秒检查一次时间
    fi
done 