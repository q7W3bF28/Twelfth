// =================================================================================
// 全局变量定义
// =================================================================================
let selectedBookcase = null; // 当前选中的书柜ID
let currentBookcasePassword = null; // 当前书柜的密码
let ably = null; // Ably实时通讯实例
let currentComic = { pages: [] }; // 当前正在阅读的漫画对象
let currentPage = 1; // 当前页码
let totalPages = 1; // 总页数
let currentZoom = 1.0; // 当前缩放比例
let currentRotation = 0; // 当前旋转角度
let keyboardListenerActive = false; // 键盘事件监听器是否激活
let passwordSubscription = null; // 密码订阅实例
const ABLY_API_KEY = 'nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk'; // Ably API密钥
const MAX_ZOOM = 3.0; // 最大缩放比例
const MIN_ZOOM = 0.25; // 最小缩放比例
const ZOOM_STEP = 0.25; // 缩放步长

// =================================================================================
// 页面初始化
// =================================================================================
/**
 * 页面加载完成后执行的初始化函数
 */
document.addEventListener('DOMContentLoaded', function() {
    // 防止多次初始化
    if (window.initCompleted) return;
    window.initCompleted = true;
    
    // 显示加载界面
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }

    // 1. 初始化Ably实时服务
    try {
        ably = new Ably.Realtime(ABLY_API_KEY);
        ably.connection.on('connected', () => {
            console.log('Ably连接成功！');
            // 隐藏加载界面
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        });
        ably.connection.on('failed', (error) => {
            console.error('Ably连接失败:', error);
            alert('实时通讯服务连接失败，密码可能无法实时更新。');
            // 隐藏加载界面
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        });
    } catch (error) {
        console.error("Ably 初始化失败:", error);
        alert("无法连接到实时服务，部分功能可能无法使用。");
        // 隐藏加载界面
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
    
    // 2. 根据当前页面路径执行不同的初始化逻辑
    const currentPath = window.location.pathname;
    if (currentPath.includes('share.html')) {
        initSharePage();
    } else if (currentPath.includes('read.html')) {
        initReadPage();
    } else { // 默认为首页
        initHomePage();
    }
    
    // 3. 检查并应用夜间模式设置
    checkNightMode();
    
    // 4. 检查本地存储支持
    if (!isLocalStorageAvailable()) {
        alert('警告：您的浏览器不支持本地存储，部分功能将无法正常工作！');
    }
});

/**
 * 检查本地存储是否可用
 */
function isLocalStorageAvailable() {
    try {
        const testKey = 'test';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 初始化首页 (index.html)
 */
function initHomePage() {
    const shareBtn = document.getElementById('start-share-btn');
    const readBtn = document.getElementById('start-read-btn');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            document.getElementById('loading-screen').style.display = 'flex';
            setTimeout(() => {
                window.location.href = 'share.html';
            }, 500);
        });
    }
    
    if (readBtn) {
        readBtn.addEventListener('click', () => {
            document.getElementById('loading-screen').style.display = 'flex';
            setTimeout(() => {
                window.location.href = 'read.html';
            }, 500);
        });
    }
}

/**
 * 初始化分享页面 (share.html)
 */
function initSharePage() {
    generateBookcases(); // 动态生成书柜选项
    
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('comic-file');
    const backHomeBtn = document.getElementById('back-home-btn');
    
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', () => {
            document.getElementById('loading-screen').style.display = 'flex';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        });
    }
    
    if (uploadArea && fileInput) {
        // 点击上传区域触发文件选择框
        uploadArea.addEventListener('click', (e) => {
            if (!e.target.closest('input')) {
                fileInput.click();
            }
        });
        
        // 设置拖放事件监听
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        uploadArea.addEventListener('dragover', () => {
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', e => {
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelection();
            }
        });
        
        // 监听文件选择变化
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // 绑定页面上的按钮事件
    document.getElementById('upload-btn')?.addEventListener('click', uploadComic);
    document.getElementById('back-btn')?.addEventListener('click', () => {
        document.getElementById('loading-screen').style.display = 'flex';
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    });
    document.getElementById('copy-password')?.addEventListener('click', copyPasswordToClipboard);
}

/**
 * 初始化阅读页面 (read.html)
 */
function initReadPage() {
    generateBookcases(); // 动态生成书柜选项
    
    // 绑定密码验证相关事件
    const verifyBtn = document.getElementById('verify-btn');
    const passwordInput = document.getElementById('password-input');
    const togglePassword = document.getElementById('toggle-password');
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyPassword);
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                verifyPassword();
            }
        });
        // 输入限制为6位
        passwordInput.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6);
        });
        
        // 自动填充密码
        setTimeout(() => {
            if (selectedBookcase && passwordInput.value === '') {
                passwordInput.value = localStorage.getItem(`bookcase_${selectedBookcase}_password`) || '123456';
            }
        }, 500);
    }
    
    if (togglePassword) {
        togglePassword.addEventListener('click', togglePasswordVisibility);
    }
    
    // 绑定查看器控制按钮事件
    document.getElementById('prev-page')?.addEventListener('click', prevPage);
    document.getElementById('next-page')?.addEventListener('click', nextPage);
    document.getElementById('fullscreen-btn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
    document.getElementById('rotate-btn')?.addEventListener('click', rotateComic);
    document.getElementById('fit-screen-btn')?.addEventListener('click', fitComicToScreen);
    document.getElementById('close-viewer')?.addEventListener('click', closeViewer);
    
    // 夜间模式按钮
    const nightModeBtn = document.querySelector('.viewer-controls button[title*="夜间模式"]');
    if (nightModeBtn) {
        nightModeBtn.addEventListener('click', toggleNightMode);
    }
    
    // 返回首页按钮
    document.getElementById('back-btn')?.addEventListener('click', () => {
        document.getElementById('loading-screen').style.display = 'flex';
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    });
}

// =================================================================================
// UI交互与DOM操作
// =================================================================================
/**
 * 动态在页面上生成书柜
 */
function generateBookcases() {
    const bookcaseGrid = document.getElementById('bookcase-grid');
    if (!bookcaseGrid) return;
    
    bookcaseGrid.innerHTML = ''; // 清空现有内容
    
    // 从本地存储获取已有漫画的书柜信息
    const bookcaseWithComics = new Set();
    for (let i = 1; i <= 10; i++) {
        const files = localStorage.getItem(`bookcase_${i}_files`);
        if (files && JSON.parse(files).length > 0) {
            bookcaseWithComics.add(i);
        }
    }
    
    for (let i = 1; i <= 10; i++) {
        const bookcase = document.createElement('div');
        bookcase.className = 'bookcase';
        bookcase.dataset.id = i;
        
        // 有漫画的书柜显示不同图标
        const icon = bookcaseWithComics.has(i) ? '📚' : '📖';
        bookcase.innerHTML = `<div class="bookcase-icon">${icon}</div><h3>书柜 ${i}</h3>`;
        
        bookcase.addEventListener('click', function() {
            // 更新选中状态
            document.querySelectorAll('.bookcase').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedBookcase = this.dataset.id;
            
            // 根据当前页面执行不同操作
            const currentPath = window.location.pathname;
            if (currentPath.includes('share.html')) {
                // 显示上传区域并更新书柜号
                const uploadSection = document.getElementById('upload-section');
                if (uploadSection) {
                    uploadSection.style.display = 'block';
                    document.getElementById('selected-bookcase-display').textContent = selectedBookcase;
                    
                    // 滚动到上传区域
                    setTimeout(() => {
                        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            } else if (currentPath.includes('read.html')) {
                // 显示密码输入区域
                const passwordSection = document.getElementById('password-section');
                if (passwordSection) {
                    passwordSection.style.display = 'block';
                    
                    // 自动填充密码
                    const passwordInput = document.getElementById('password-input');
                    if (passwordInput) {
                        passwordInput.value = localStorage.getItem(`bookcase_${selectedBookcase}_password`) || '123456';
                        setTimeout(() => {
                            passwordInput.focus();
                            passwordInput.select();
                        }, 100);
                    }
                    
                    // 滚动到密码区域
                    setTimeout(() => {
                        passwordSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            }
        });
        
        bookcaseGrid.appendChild(bookcase);
    }
}

/**
 * 处理用户选择的文件，并显示文件信息和预览
 */
function handleFileSelection() {
    const fileInput = document.getElementById('comic-file');
    const fileInfo = document.getElementById('file-info');
    
    if (!fileInput || !fileInfo) return;
    
    if (!fileInput.files.length) {
        fileInfo.style.display = 'none';
        return;
    }
    
    const file = fileInput.files[0];
    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.zip')) {
        alert('仅支持PDF和ZIP格式的文件');
        fileInput.value = '';
        return;
    }
    
    // 验证文件大小（最大500MB）
    if (file.size > 500 * 1024 * 1024) {
        alert('文件大小不能超过500MB');
        fileInput.value = '';
        return;
    }
    
    // 显示文件名和大小
    document.getElementById('file-name').textContent = `文件名: ${file.name}`;
    document.getElementById('file-size').textContent = `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    
    // 生成文件预览
    const filePreview = document.getElementById('file-preview');
    if (filePreview) {
        filePreview.innerHTML = ''; // 清空旧预览
        let previewElement;
        
        if (file.type.startsWith('image/')) {
            previewElement = document.createElement('img');
            previewElement.src = URL.createObjectURL(file);
            previewElement.onload = () => URL.revokeObjectURL(previewElement.src);
            previewElement.alt = '文件预览';
        } else {
            // 对于PDF和ZIP，显示图标
            previewElement = document.createElement('div');
            previewElement.style.fontSize = '3rem';
            previewElement.style.textAlign = 'center';
            if (file.name.toLowerCase().endsWith('.pdf')) {
                previewElement.innerHTML = '📄';
            } else if (file.name.toLowerCase().endsWith('.zip')) {
                previewElement.innerHTML = '📦';
            }
        }
        
        previewElement.className = 'file-preview';
        filePreview.appendChild(previewElement);
    }
    
    fileInfo.style.display = 'block';
    setTimeout(() => {
        fileInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}

/**
 * 将生成的密码复制到剪贴板
 */
function copyPasswordToClipboard() {
    const passwordEl = document.getElementById('new-password');
    if (!passwordEl) return;
    
    const password = passwordEl.textContent;
    navigator.clipboard.writeText(password).then(() => {
        const btn = document.getElementById('copy-password');
        if (btn) {
            const originalText = btn.textContent;
            btn.innerHTML = '✓ 已复制';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        }
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制。');
    });
}

/**
 * 切换密码输入框的可见性
 */
function togglePasswordVisibility() {
    const input = document.getElementById('password-input');
    const iconButton = document.getElementById('toggle-password');
    if (!input || !iconButton) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        iconButton.textContent = '😑';
        iconButton.title = '隐藏密码';
    } else {
        input.type = 'password';
        iconButton.textContent = '👁️';
        iconButton.title = '显示密码';
    }
}

/**
 * 切换夜间模式
 */
function toggleNightMode() {
    document.body.classList.toggle('night-mode');
    const isNight = document.body.classList.contains('night-mode');
    localStorage.setItem('nightMode', isNight);
    
    // 更新夜间模式按钮图标
    const nightModeBtn = document.querySelector('.night-mode-btn, .viewer-controls button[title*="夜间模式"]');
    if (nightModeBtn) {
        nightModeBtn.textContent = isNight ? '☀️' : '🌙';
    }
}

/**
 * 检查本地存储并应用夜间模式
 */
function checkNightMode() {
    const isNightMode = localStorage.getItem('nightMode') === 'true';
    if (isNightMode) {
        document.body.classList.add('night-mode');
        
        // 更新夜间模式按钮图标
        const nightModeBtn = document.querySelector('.night-mode-btn, .viewer-controls button[title*="夜间模式"]');
        if (nightModeBtn) {
            nightModeBtn.textContent = '☀️';
        }
    }
}

// =================================================================================
// 核心业务逻辑 (上传、验证)
// =================================================================================
/**
 * 上传漫画文件
 */
async function uploadComic() {
    const fileInput = document.getElementById('comic-file');
    const uploadBtn = document.getElementById('upload-btn');
    
    // 验证输入
    if (!fileInput || !fileInput.files.length) {
        alert('请选择要上传的文件');
        return;
    }
    
    if (!selectedBookcase) {
        alert('请先选择一个书柜');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.zip')) {
        alert('仅支持PDF和ZIP格式的文件');
        return;
    }
    
    // 更新UI为上传中状态
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');
    
    if (progressContainer && progressBar && progressText) {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '准备上传...';
    }
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> 上传中...';
    }
    
    try {
        // 调用GoFile上传，并传入进度回调
        const result = await uploadToGoFile(file, (progress) => {
            if (progressBar && progressText) {
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `上传中: ${progress}%`;
            }
        });
        
        // 上传成功后处理
        if (result && result.directLink) {
            // 将文件信息存入localStorage
            const bookcaseFiles = JSON.parse(localStorage.getItem(`bookcase_${selectedBookcase}_files`) || '[]');
            bookcaseFiles.push({
                fileId: result.fileId,
                name: result.fileName,
                directLink: result.directLink,
                uploadTime: new Date().toISOString() // 增加上传时间
            });
            localStorage.setItem(`bookcase_${selectedBookcase}_files`, JSON.stringify(bookcaseFiles));
            
            // 生成并更新密码
            const newPassword = generateRandomPassword();
            localStorage.setItem(`bookcase_${selectedBookcase}_password`, newPassword);
            
            // 发布密码更新
            if (ably) {
                const publishSuccess = publishNewPassword(selectedBookcase, newPassword);
                if (!publishSuccess) {
                    console.warn('密码发布失败，但已保存在本地');
                }
            } else {
                console.warn('Ably未初始化，无法发布密码更新');
            }
            
            // 显示成功信息
            const successMessage = document.getElementById('success-message');
            if (successMessage) {
                document.getElementById('selected-bookcase').textContent = selectedBookcase;
                document.getElementById('new-password').textContent = newPassword;
                successMessage.style.display = 'block';
                successMessage.scrollIntoView({ behavior: 'smooth' });
            }
            
            // 隐藏上传相关元素
            const fileInfo = document.getElementById('file-info');
            if (fileInfo) fileInfo.style.display = 'none';
            if (progressContainer) progressContainer.style.display = 'none';
            
            // 重置文件输入
            if (fileInput) fileInput.value = '';
            
            // 更新书柜显示（标记有漫画）
            generateBookcases();
        } else {
            throw new Error('上传失败：未获取到有效的返回链接。');
        }
    } catch (error) {
        console.error('上传错误:', error);
        alert(`上传失败: ${error.message}`);
        
        // 显示错误信息
        if (progressText) {
            progressText.textContent = `上传失败: ${error.message}`;
            progressBar.style.backgroundColor = '#ff6b6b';
        }
    } finally {
        // 无论成功失败，都重置上传按钮状态
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<span>📤 上传漫画</span>';
        }
    }
}

/**
 * 验证用户输入的书柜密码
 */
async function verifyPassword() {
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');
    const verifyBtn = document.getElementById('verify-btn');
    
    if (!passwordInput || !verifyBtn) return;
    
    const password = passwordInput.value.trim();
    
    // 格式验证
    if (!/^[A-Za-z0-9]{6}$/.test(password)) {
        if (errorMessage) {
            errorMessage.textContent = "密码必须是6位字母或数字组合";
            errorMessage.style.display = 'block';
        }
        passwordInput.focus();
        return;
    }
    
    // UI进入验证中状态
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="loading-spinner"></span> 验证中...';
    if (errorMessage) errorMessage.style.display = 'none';
    
    try {
        const storedPassword = localStorage.getItem(`bookcase_${selectedBookcase}_password`) || '123456';
        
        if (password === storedPassword) {
            // 密码正确
            if (errorMessage) errorMessage.style.display = 'none';
            
            // 显示漫画查看器
            const passwordSection = document.getElementById('password-section');
            const comicViewer = document.getElementById('comic-viewer');
            
            if (passwordSection) passwordSection.style.display = 'none';
            if (comicViewer) {
                comicViewer.style.display = 'block';
                setTimeout(() => {
                    comicViewer.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
            
            enableKeyboardNavigation(); // 启用键盘控制
            
            // 获取并显示漫画
            const comics = getComicsInBookcase(selectedBookcase);
            if (comics.length > 0) {
                // 按上传时间排序，最新的在前
                comics.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));
                
                currentComic = comics[0]; // 默认显示最新的
                displayComic(currentComic);
                
                // 显示当前密码并订阅更新
                const currentPasswordEl = document.getElementById('current-password');
                if (currentPasswordEl) {
                    currentPasswordEl.textContent = storedPassword;
                    currentBookcasePassword = storedPassword;
                }
                
                // 订阅密码更新
                if (ably) {
                    // 先取消之前的订阅
                    if (passwordSubscription) {
                        passwordSubscription.unsubscribe();
                    }
                    
                    passwordSubscription = subscribeToPasswordUpdates(selectedBookcase, (message) => {
                        const newPassword = message.data;
                        currentBookcasePassword = newPassword;
                        
                        if (currentPasswordEl) {
                            currentPasswordEl.textContent = newPassword;
                        }
                        
                        // 更新本地存储
                        localStorage.setItem(`bookcase_${selectedBookcase}_password`, newPassword);
                        
                        const updateIndicator = document.getElementById('password-update-indicator');
                        if (updateIndicator) {
                            updateIndicator.textContent = '(已更新)';
                            updateIndicator.style.display = 'inline-block';
                            
                            // 5秒后隐藏更新提示
                            setTimeout(() => {
                                if (updateIndicator) updateIndicator.style.display = 'none';
                            }, 5000);
                        }
                    });
                }
            } else {
                alert('该书柜中没有漫画');
                closeViewer();
            }
        } else {
            // 密码错误
            if (errorMessage) {
                errorMessage.textContent = "密码错误，请重新输入";
                errorMessage.style.display = 'block';
            }
            
            // 添加抖动动画
            passwordInput.classList.add('shake');
            setTimeout(() => {
                passwordInput.classList.remove('shake');
            }, 500);
            
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('验证密码错误:', error);
        alert('验证失败，请重试');
    } finally {
        // 重置验证按钮
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '🔓 验证密码';
    }
}

// =================================================================================
// 漫画查看器逻辑
// =================================================================================
/**
 * 根据漫画类型（PDF/ZIP）显示内容
 */
function displayComic(comic) {
    if (!comic) return;
    
    const titleEl = document.getElementById('comic-title');
    const pdfViewer = document.getElementById('pdf-viewer');
    const zipViewer = document.getElementById('zip-viewer');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (titleEl) {
        titleEl.textContent = comic.name;
    }
    
    // 重置状态
    currentPage = 1;
    currentZoom = 1.0;
    currentRotation = 0;
    
    // 隐藏所有查看器
    if (pdfViewer) pdfViewer.style.display = 'none';
    if (zipViewer) zipViewer.style.display = 'none';
    
    // 显示加载指示器
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    // 根据文件类型显示对应查看器
    if (comic.format === 'pdf') {
        if (pdfViewer) {
            pdfViewer.style.display = 'block';
            displayPDF(comic.url).catch(err => {
                console.error('PDF显示错误:', err);
                alert(`无法显示PDF: ${err.message}`);
            }).finally(() => {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            });
        }
    } else if (comic.format === 'zip') {
        if (zipViewer) {
            zipViewer.style.display = 'block';
            displayZIP(comic.url).catch(err => {
                console.error('ZIP显示错误:', err);
                alert(`无法显示ZIP: ${err.message}`);
            }).finally(() => {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            });
        }
    }
    
    updateComicDisplay();
}

/**
 * 更新漫画阅读器的显示状态（页码、缩放等）
 */
function updateComicDisplay() {
    // 更新UI文本
    const pageCounter = document.getElementById('page-counter');
    const zoomPercent = document.getElementById('zoom-percent');
    
    if (pageCounter) pageCounter.textContent = `${currentPage}/${totalPages}`;
    if (zoomPercent) zoomPercent.textContent = `${Math.round(currentZoom * 100)}%`;
    
    // 更新翻页按钮状态
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    // 应用缩放和旋转
    const canvas = document.getElementById('pdf-canvas');
    const image = document.getElementById('comic-image');
    const transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
    
    if (canvas) canvas.style.transform = transform;
    if (image) image.style.transform = transform;
    
    // 根据漫画类型更新页面内容
    if (currentComic?.format === 'pdf') {
        displayCurrentPDFPage().catch(err => {
            console.error('PDF页面显示错误:', err);
        });
    } else if (currentComic?.format === 'zip' && currentComic.pages) {
        const targetPage = currentComic.pages[currentPage - 1];
        if (targetPage) {
            displayImage(targetPage).catch(err => {
                console.error('图片显示错误:', err);
            });
        }
    }
    
    updateReaderProgress();
}

/**
 * 控制上一页
 */
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateComicDisplay();
    }
}

/**
 * 控制下一页
 */
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updateComicDisplay();
    }
}

/**
 * 放大
 */
function zoomIn() {
    if (currentZoom < MAX_ZOOM) {
        currentZoom += ZOOM_STEP;
        updateComicDisplay();
    }
}

/**
 * 缩小
 */
function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
        currentZoom -= ZOOM_STEP;
        updateComicDisplay();
    }
}

/**
 * 旋转
 */
function rotateComic() {
    currentRotation = (currentRotation + 90) % 360;
    updateComicDisplay();
}

/**
 * 适应屏幕
 */
function fitComicToScreen() {
    if (!currentComic) return;
    
    const container = document.querySelector('.viewer-container');
    if (!container) return;
    
    const containerWidth = container.clientWidth - 40; // 留出边距
    const containerHeight = container.clientHeight - 40;
    
    if (currentComic.format === 'pdf') {
        const canvas = document.getElementById('pdf-canvas');
        if (canvas) {
            const scaleX = containerWidth / canvas.width;
            const scaleY = containerHeight / canvas.height;
            currentZoom = Math.min(scaleX, scaleY, MAX_ZOOM);
        }
    } else if (currentComic.format === 'zip') {
        const image = document.getElementById('comic-image');
        if (image && image.naturalWidth) {
            const scaleX = containerWidth / image.naturalWidth;
            const scaleY = containerHeight / image.naturalHeight;
            currentZoom = Math.min(scaleX, scaleY, MAX_ZOOM);
        }
    }
    
    updateComicDisplay();
}

/**
 * 切换全屏模式
 */
function toggleFullscreen() {
    const viewerContainer = document.querySelector('.viewer-container');
    if (!viewerContainer) return;
    
    if (!document.fullscreenElement) {
        viewerContainer.requestFullscreen().catch(err => {
            alert(`无法进入全屏模式: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * 关闭查看器，返回密码输入界面
 */
function closeViewer() {
    // 清理资源
    clearImageCache(); // 调用zip-viewer.js中的清理函数
    if (passwordSubscription) {
        passwordSubscription.unsubscribe();
        passwordSubscription = null;
    }
    
    // 隐藏查看器，显示密码区域
    const comicViewer = document.getElementById('comic-viewer');
    const passwordSection = document.getElementById('password-section');
    
    if (comicViewer) comicViewer.style.display = 'none';
    if (passwordSection) passwordSection.style.display = 'block';
    
    disableKeyboardNavigation();
}

/**
 * 更新页面底部的阅读进度条
 */
function updateReaderProgress() {
    const progressBar = document.getElementById('reader-progress-bar');
    if (progressBar && totalPages > 0) {
        const progress = (currentPage / totalPages) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

/**
 * 启用键盘快捷键
 */
function enableKeyboardNavigation() {
    if (keyboardListenerActive) return;
    document.addEventListener('keydown', handleKeyDown);
    keyboardListenerActive = true;
}

/**
 * 禁用键盘快捷键
 */
function disableKeyboardNavigation() {
    document.removeEventListener('keydown', handleKeyDown);
    keyboardListenerActive = false;
}

/**
 * 处理键盘按键事件的函数
 */
function handleKeyDown(e) {
    // 输入框中不响应快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // 快捷键映射
    const keyMap = {
        'ArrowLeft': prevPage,
        'ArrowRight': nextPage,
        '+': zoomIn,
        '=': zoomIn,
        '-': zoomOut,
        '_': zoomOut,
        'f': toggleFullscreen,
        'r': rotateComic,
        '0': fitComicToScreen,
        'n': toggleNightMode,
    };
    
    if (keyMap[e.key]) {
        e.preventDefault();
        keyMap[e.key]();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            closeViewer();
        }
    }
}

// =================================================================================
// 工具函数
// =================================================================================
/**
 * 生成一个6位的随机字母数字密码
 * @returns {string} 随机密码
 */
function generateRandomPassword() {
    const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let password = "";
    for (let i = 0; i < 6; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * 从本地存储获取指定书柜的密码
 * @param {string} bookcaseId - 书柜ID
 * @returns {string} 密码
 */
function getBookcasePassword(bookcaseId) {
    try {
        return localStorage.getItem(`bookcase_${bookcaseId}_password`) || '123456';
    } catch (error) {
        console.error('获取书柜密码错误:', error);
        return '123456';
    }
}

/**
 * 更新本地存储中指定书柜的密码
 * @param {string} bookcaseId - 书柜ID
 * @param {string} newPassword - 新密码
 * @returns {boolean} 是否成功
 */
function updateBookcasePassword(bookcaseId, newPassword) {
    try {
        localStorage.setItem(`bookcase_${bookcaseId}_password`, newPassword);
        return true;
    } catch (error) {
        console.error('更新书柜密码错误:', error);
        return false;
    }
}

/**
 * 获取书柜中的漫画（从localStorage）
 */
function getComicsInBookcase(bookcaseId) {
    try {
        // 从localStorage获取书柜中的漫画
        const files = JSON.parse(localStorage.getItem(`bookcase_${bookcaseId}_files`) || '[]');
        return files.map(file => ({
            name: file.name,
            url: file.directLink,
            format: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'zip',
            uploadTime: file.uploadTime
        }));
    } catch (error) {
        console.error('获取书柜漫画错误:', error);
        return [];
    }
}