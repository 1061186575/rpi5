import cv2
import os
import numpy as np
import shlex

# 文件功能: 对比图片内容，如果内容接近一致，则删除后面的图片

# 图片目录
directory = "/home/admin/Desktop/project/xxx"

# 设定差异阈值，低于这个值认为图片相似
DIFFERENCE_THRESHOLD = 2 * 1000000

# 小于 934704 可以认为一致, 所以 DIFFERENCE_THRESHOLD 标准设置为 1000000, 2000000 效果更好, 4000000 精品
# 同一场景移动了cam位置: 7930255
# 如果是高清图片(1.2MB), 相同图片 diff 值约为 33938437 ~ 40095118, 处理速度就比较慢

# 获取目录下所有png文件，并按最后修改时间排序
image_files = sorted(
    [f for f in os.listdir(directory) if f.endswith('.jpg')],
    key=lambda x: os.path.getmtime(os.path.join(directory, x))
)
#print("Image files", image_files)


def calculate_difference(image1_path, image2_path):
    # 加载图片
    image1 = cv2.imread(os.path.join(directory, image1_path))
    image2 = cv2.imread(os.path.join(directory, image2_path))

    # 检查图像是否加载成功
    if image1 is None or image2 is None:
        print(f"Error loading images: {image1_path}, {image2_path}")
        return float('inf')  # 返回一个很大的差值，确保出错的图像不会被删除

    # 确保图像尺寸一致
    if image1.shape != image2.shape:
        print(f"Resizing images: {image1_path}, {image2_path}")
        image2 = cv2.resize(image2, (image1.shape[1], image1.shape[0]))

    # 将图片转换为灰度图像
    gray1 = cv2.cvtColor(image1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(image2, cv2.COLOR_BGR2GRAY)

    # 计算绝对差异
    diff = cv2.absdiff(gray1, gray2)
    # 计算差异的总和
    diff_sum = np.sum(diff)

    return diff_sum

# 遍历图片列表
i = 0
while i < len(image_files) - 1:
    current_image = image_files[i]
    next_image = image_files[i + 1]

    diff = calculate_difference(current_image, next_image)
    print(f"Comparing {current_image} and {next_image} (diff: {diff})")

    if diff < DIFFERENCE_THRESHOLD:
        # 差异小，删除下一张图片
        print(f"Deleting {next_image} (diff: {diff})")
        os.remove(os.path.join(directory, next_image))
        image_files.pop(i + 1)
    else:
        # 差异大，保留下一张图片，继续对比
        i += 1

print("图片处理完成\n\n", image_files)
