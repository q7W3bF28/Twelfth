let currentImageUrl = null;
let imageCache = new Map();

// 显示ZIP文件中的图像
async function displayZIP(zipUrl) {
    try {
        console.log('开始处理ZIP文件:', zipUrl);
        
        // 获取ZIP文件
        const response = await fetch(zipUrl, {
            cache: 'force-cache'
        });
        
        if (!response.ok) {
            throw new Error(`下载ZIP文件失败，状态码: ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('ZIP文件下载完成，大小:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
        
        // 解压ZIP文件
        const zip = await JSZip.loadAsync(blob);
        
        // 获取所有图像文件
        const imageFiles = [];
        zip.forEach((relativePath, file) => {
            if (!file.dir && (/\.(jpg|jpeg|png|webp|gif)$/i).test(file.name)) {
                imageFiles.push(file);
            }
        });
        
        if (imageFiles.length === 0) {
            throw new Error('ZIP文件中没有找到支持的图像格式 (jpg, jpeg, png, webp, gif)');
        }
        
        // 按文件名进行自然排序
        imageFiles.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { 
                numeric: true, 
                sensitivity: 'base' 
            });
        });
        
        console.log('找到', imageFiles.length, '张图片');
        
        // 存储页面数据
        currentComic.pages = imageFiles;
        totalPages = imageFiles.length;
        
        // 显示第一张图像
        currentPage = 1;
        await displayImage(imageFiles[0]);
        
        // 预加载下一张图片
        preloadNextImage();
        
    } catch (error) {
        console.error('处理ZIP文件错误:', error);
        alert('无法处理ZIP文件。\n\n可能的原因：\n1. 文件链接已失效\n2. 文件格式不支持\n3. 文件已损坏\n\n错误信息：' + error.message);
    }
}

// 显示图像
async function displayImage(imageFile) {
    if (!imageFile) return;
    
    try {
        const cacheKey = imageFile.name;
        
        // 检查缓存
        if (imageCache.has(cacheKey)) {
            const imageUrl = imageCache.get(cacheKey);
            displayImageUrl(imageUrl);
            return;
        }
        
        console.log('加载图片:', imageFile.name);
        
        // 获取图像数据
        const imageData = await imageFile.async('blob');
        const imageUrl = URL.createObjectURL(imageData);
        
        // 缓存图片
        imageCache.set(cacheKey, imageUrl);
        
        displayImageUrl(imageUrl);
        
        // 预加载下一张图片
        preloadNextImage();
        
    } catch (error) {
        console.error('显示图像错误:', error);
        alert('加载图片失败: ' + error.message);
    }
}

// 显示图片URL
function displayImageUrl(imageUrl) {
    // 释放之前的URL
    if (currentImageUrl && !imageCache.has(currentImageUrl)) {
        URL.revokeObjectURL(currentImageUrl);
    }
    
    currentImageUrl = imageUrl;
    
    const image = document.getElementById('comic-image');
    if (!image) return;
    
    image.src = imageUrl;
    image.style.transform = `scale(1) rotate(0deg)`;
    
    // 图片加载完成后适应屏幕
    image.onload = () => {
        console.log('图片加载完成:', image.naturalWidth, 'x', image.naturalHeight);
        if (document.getElementById('comic-viewer').style.display !== 'none') {
            fitComicToScreen();
        }
    };
    
    image.onerror = () => {
        console.error('图片加载失败:', image.src);
        alert('图片加载失败，请尝试刷新页面');
    };
}

// 预加载下一张图片
function preloadNextImage() {
    if (!currentComic || !currentComic.pages || currentPage >= totalPages) return;
    
    const nextImageFile = currentComic.pages[currentPage]; // 注意索引
    if (!nextImageFile) return;
    
    const cacheKey = nextImageFile.name;
    if (imageCache.has(cacheKey)) return;
    
    // 异步预加载
    nextImageFile.async('blob').then(blob => {
        const url = URL.createObjectURL(blob);
        imageCache.set(cacheKey, url);
        
        // 预加载图片但不显示
        const img = new Image();
        img.src = url;
        img.onload = () => console.log('预加载完成:', nextImageFile.name);
    }).catch(err => console.error("预加载失败:", err));
}

// 清理缓存
function clearImageCache() {
    imageCache.forEach(url => URL.revokeObjectURL(url));
    imageCache.clear();
    if (currentImageUrl) {
        URL.revokeObjectURL(currentImageUrl);
        currentImageUrl = null;
    }
}