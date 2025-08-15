// 发布新密码
function publishNewPassword(bookcaseId, password) {
    try {
        if (!ably) {
            console.error('Ably未初始化');
            return false;
        }
        
        // 检查连接状态
        if (ably.connection.state !== 'connected') {
            console.warn('Ably连接未就绪，状态:', ably.connection.state);
            return false;
        }
        
        const channel = ably.channels.get(`bookcase-${bookcaseId}-pw`);
        channel.publish('new-password', password, (err) => {
            if (err) {
                console.error('发布密码更新错误:', err);
                return false;
            } else {
                console.log(`已发布书柜 ${bookcaseId} 的新密码: ${password}`);
                return true;
            }
        });
    } catch (error) {
        console.error('发布密码更新错误:', error);
        alert('密码发布失败，请重试');
        return false;
    }
}

// 订阅密码更新
function subscribeToPasswordUpdates(bookcaseId, callback) {
    try {
        if (!ably) {
            console.error('Ably未初始化');
            return null;
        }
        
        // 检查连接状态
        if (ably.connection.state !== 'connected') {
            console.warn('Ably连接未就绪，状态:', ably.connection.state);
            return null;
        }
        
        const channel = ably.channels.get(`bookcase-${bookcaseId}-pw`);
        const subscription = channel.subscribe('new-password', (message) => {
            console.log(`收到书柜 ${bookcaseId} 密码更新: ${message.data}`);
            callback(message);
        });
        
        console.log(`已订阅书柜 ${bookcaseId} 的密码更新`);
        return subscription;
    } catch (error) {
        console.error('订阅密码更新错误:', error);
        alert('密码订阅失败，请重试');
        return null;
    }
}