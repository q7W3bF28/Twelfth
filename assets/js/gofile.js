// GoFile.io 配置
const GOFILE_ACCOUNT_ID = '9e174948-3c6c-47e6-a706-8aedbf7b8598';
const GOFILE_ACCOUNT_TOKEN = '8UO7T53rxM6Eh3WzolDR4SeaLedZ17bE';

// 获取GoFile服务器
async function getGoFileServer() {
    try {
        console.log('正在获取GoFile服务器...');
        const response = await fetch('https://api.gofile.io/servers');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`获取服务器失败，状态码: ${response.status}. 响应: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('服务器响应:', data);
        
        if (data.status === 'ok' && data.data && data.data.servers && data.data.servers.length > 0) {
            // 选择最佳服务器（按负载最低）
            const servers = data.data.servers;
            const bestServer = Object.entries(servers).reduce((best, [name, server]) => {
                return (!best || server.load < best.load) ? {name, ...server} : best;
            }, null);
            
            if (bestServer) {
                console.log(`选择服务器: ${bestServer.name} (负载: ${bestServer.load})`);
                return bestServer.name;
            } else {
                throw new Error('无法找到最佳服务器');
            }
        } else {
            throw new Error('无法获取GoFile服务器: ' + (data.status || '未知状态'));
        }
    } catch (error) {
        console.error('获取GoFile服务器错误:', error);
        // 回退到默认服务器
        console.warn('使用备用服务器: store1');
        return 'store1';
    }
}

// 上传文件到GoFile
async function uploadToGoFile(file, onProgress) {
    try {
        console.log('开始上传文件:', file.name, '大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        
        // 1. 获取服务器
        const server = await getGoFileServer();
        console.log('使用服务器:', server);
        
        // 2. 创建FormData
        const formData = new FormData();
        formData.append('token', GOFILE_ACCOUNT_TOKEN);
        formData.append('folderId', GOFILE_ACCOUNT_ID);
        formData.append('file', file);
        
        // 3. 使用XMLHttpRequest上传以支持进度
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const uploadUrl = `https://${server}.gofile.io/uploadFile`;
            console.log('上传URL:', uploadUrl);
            
            xhr.open('POST', uploadUrl, true);
            
            // 设置超时
            xhr.timeout = 10 * 60 * 1000; // 10分钟
            
            // 进度事件监听
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    console.log('上传进度:', percent + '%');
                    if (onProgress) onProgress(percent);
                }
            });
            
            // 请求完成处理
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('上传响应:', response);
                        if (response.status === 'ok' && response.data) {
                            resolve({
                                directLink: `https://${server}.gofile.io/download/${response.data.fileId}/${response.data.fileName}`,
                                fileId: response.data.fileId,
                                fileName: response.data.fileName,
                                downloadPage: `https://gofile.io/d/${response.data.fileId}`
                            });
                        } else {
                            reject(new Error('上传失败: ' + (response.data?.message || response.status || '未知错误')));
                        }
                    } catch (e) {
                        reject(new Error('服务器返回无效响应: ' + xhr.responseText));
                    }
                } else {
                    reject(new Error(`上传失败，状态码: ${xhr.status}, 响应: ${xhr.responseText}`));
                }
            };
            
            // 错误处理
            xhr.onerror = () => {
                reject(new Error('网络错误，请检查网络连接'));
            };
            
            xhr.onabort = () => {
                reject(new Error('上传已取消'));
            };
            
            xhr.ontimeout = () => {
                reject(new Error('上传超时，请检查网络连接'));
            };
            
            // 4. 发送请求
            xhr.send(formData);
        });
    } catch (error) {
        console.error('上传到GoFile错误:', error);
        throw error;
    }
}