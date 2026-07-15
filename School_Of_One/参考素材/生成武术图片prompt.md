# 批量生成专用完整提示词（分AI绘图通用中文长描述+英文参数版，适配批量出图）
## 一、中文详细批量生成Prompt（复制直接用，精准约束尺寸、透明、风格、构图）
### 主描述（可批量替换动作词，如揽雀尾、弓步冲拳、单鞭等）
透明背景PNG素材，无任何底色、无杂色背景、无纸张、无边框、无文字、无印章，Alpha透明通道完整；画布尺寸固定宽600px、高800px竖版；画面中心绘制一名传统武师武术招式人物，人物整体占画布垂直+横向比例70%，严格居中放置，上下左右留有均匀透明留白；
明清木刻古籍白描线稿风格，复刻古武谱版画笔法，纯墨色轮廓线条，线条古朴苍劲流畅，衣纹、绑腿、筋骨刻画简练写实；人物造型：古代束发武人，束发头巾、粗布短打上衣、布腰带、裹腿绑布、黑布鞋，传统武术短打装束；仅淡米黄宣纸质感淡填色，不厚重上色，保留单色古刻本素雅质感；
仅保留人物招式线稿，无多余景物、无污渍、无茶渍、无虫洞、无书页元素，干净独立人物素材；高清线稿细节，边缘干净利落，适配叠加古籍书页底图使用；输出格式为PNG透明底，无白底填充。

### 可批量替换动作模板（替换【招式名称】即可批量产出）
招式动作：【揽雀尾/单鞭/搂膝拗步/云手/倒撵猴】，标准太极拳古谱武术套路动作，体态舒展，马步/弓步标准，肢体姿态符合传统拳谱图说规范。

## 二、英文参数版（适配Midjourney、Stable Diffusion批量出图）
```
PNG transparent background, full alpha channel, no background, no paper, no frame, no text, no seal, vertical canvas size 600px width × 800px height, ancient Chinese martial artist figure centered in frame, figure accounts for 70% of total canvas area, even transparent blank space around character.
Style: Ming and Qing dynasty woodcut line drawing, old martial arts manual engraving sketch, only black ink outline lines, simple and smooth ancient line art, no heavy coloring, light beige faint tint on clothes only.
Character: ancient Chinese martial man with hair bun and headscarf, linen short coat, cloth sash, leg wrappings, black cloth shoes, traditional short fighting outfit, standard Tai Chi movement 【Lan Que Wei】, accurate ancient boxing posture.
Clean cutout character only, no stains, no tea marks, no moth holes, no extra scenery, high clear line details, edge clean, isolated figure material for overlay on ancient book pages, output PNG transparent format --ar 600:800 --style raw
```

## 三、批量生成硬性约束规则（防止出图跑偏，批量设置必看）
1. **尺寸强制**：宽600像素，高800像素，竖版3:4比例，不允许自动缩放、拉伸画布；
2. **透明底强制**：关闭背景填充、禁用纸张/古籍底纹，所有空白区域透明，输出格式锁定PNG，禁止JPG；
3. **构图比例**：人物整体外轮廓占据整张画布70%，绝对居中，不会贴画面边缘、不会过小/过大；
4. **风格锁定**
    - 仅明清木刻白描，无现代卡通、厚涂、水彩写实；
    - 只有墨线+极淡米黄浅底色，无彩色装饰；
    - 线条复刻古拳谱刻本，粗细轻微变化，模拟雕版印刷质感；
5. **元素剔除**：批量生成时自动屏蔽文字、书页边框、茶渍、虫蛀、山水背景、印章等无关元素，只输出独立人物线稿素材；
6. **用途适配**：生成素材可直接叠加在泛黄古籍书页底图上，透明区域完美透出底层宣纸纹理。

## 四、批量替换使用示例（一键切换招式，批量出全套拳谱人物）
完整成品提示词示例（揽雀尾）：
透明背景PNG素材，无任何底色、无杂色背景、无纸张、无边框、无文字、无印章，Alpha透明通道完整；画布尺寸固定宽600px、高800px竖版；画面中心绘制一名传统武师武术招式人物，人物整体占画布垂直+横向比例70%，严格居中放置，上下左右留有均匀透明留白；
明清木刻古籍白描线稿风格，复刻古武谱版画笔法，纯墨色轮廓线条，线条古朴苍劲流畅，衣纹、绑腿、筋骨刻画简练写实；人物造型：古代束发武人，束发头巾、粗布短打上衣、布腰带、裹腿绑布、黑布鞋，传统武术短打装束；仅淡米黄宣纸质感淡填色，不厚重上色，保留单色古刻本素雅质感；
仅保留人物招式线稿，无多余景物、无污渍、无茶渍、无虫洞、无书页元素，干净独立人物素材；高清线稿细节，边缘干净利落，适配叠加古籍书页底图使用；输出格式为PNG透明底，无白底填充。
将画面里古代武师人物完整抠取分离，删除所有背景，生成带完整透明通道的 PNG 素材，保留原图全部线稿、淡米黄填色、人物服饰与寸拳动作，人物轮廓边缘平滑干净，无残留底色杂边。
招式动作：揽雀尾，标准太极拳古谱武术套路动作，体态舒展，弓步标准，肢体姿态符合传统拳谱图说规范。

需要我把这段压缩成一段极简、可直接复制进AI绘图工具的短句批量指令吗？