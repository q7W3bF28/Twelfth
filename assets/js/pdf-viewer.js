let pdfDoc = null;

// 显示PDF文件
async function displayPDF(pdfUrl) {
    try {
        console.log('开始加载PDF:', pdfUrl);
        
        // 配置PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        // 加载PDF文档
        const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
            cMapPacked: true,
            enableXfa: false,
            enableWebGL: false
        });
        
        pdfDoc = await loadingTask.promise;
        console.log('PDF加载成功，总页数:', pdfDoc.numPages);
        
        // 获取总页数
        totalPages = pdfDoc.numPages;
        
        // 显示第一页
        await displayPage(1);
        
    } catch (error) {
        console.error('加载PDF错误:', error);
        alert('无法加载PDF文件。\n\n可能的原因：\n1. 文件链接已失效\n2. 网络连接问题\n3. 文件格式不支持\n\n请尝试刷新页面或联系分享者。');
    }
}

// 显示当前PDF页面
async function displayCurrentPDFPage() {
    if (pdfDoc) {
        await displayPage(currentPage);
    }
}

// 渲染指定页码
async function displayPage(pageNumber) {
    if (!pdfDoc || pageNumber < 1 || pageNumber > pdfDoc.numPages) return;
    
    try {
        console.log('渲染PDF第', pageNumber, '页');
        
        // 获取页面
        const page = await pdfDoc.getPage(pageNumber);
        
        // 获取canvas容器尺寸
        const container = document.querySelector('.viewer-container');
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        // 计算适合的缩放比例
        const viewport = page.getViewport({ scale: 1.0 });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY, 1.5) * currentZoom;
        
        // 应用缩放
        const scaledViewport = page.getViewport({ scale: scale });
        
        // 获取canvas
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        
        // 设置canvas尺寸
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        
        // 渲染页面
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        
        await page.render(renderContext).promise;
        
        console.log('PDF第', pageNumber, '页渲染完成');
        
    } catch (error) {
        console.error(`渲染PDF第 ${pageNumber} 页错误:`, error);
        alert(`渲染第 ${pageNumber} 页失败，请尝试刷新页面`);
    }
}