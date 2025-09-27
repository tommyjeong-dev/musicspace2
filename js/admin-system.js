// js/admin-system.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 전역 변수 ---
    let systemStatusInterval = null;

    // --- 2. 사용자 인증 관련 함수 ---
    
    /** 사용자 인증 상태 확인 */
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/user', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('로그인 상태:', data.user.username, '관리자:', data.user.isAdmin);
                
                // 관리자가 아니면 접근 거부
                if (!data.user.isAdmin) {
                    alert('관리자 권한이 필요합니다.');
                    window.location.href = '/index.html';
                    return;
                }
                
                // 로그인된 상태 - 상단 사용자 정보 영역 표시
                const userInfoEl = document.getElementById('user-info');
                const usernameEl = document.getElementById('username');
                if (userInfoEl && usernameEl) {
                    userInfoEl.style.display = 'flex';
                    usernameEl.textContent = data.user.username;
                }
                
            } else {
                console.log('로그인되지 않은 상태');
                alert('로그인이 필요합니다.');
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('인증 상태 확인 오류:', error);
            alert('인증 상태 확인 중 오류가 발생했습니다.');
            window.location.href = '/login.html';
        }
    }

    /** 로그아웃 기능 */
    async function logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                console.log('로그아웃 성공');
                window.location.href = '/login.html';
            } else {
                console.error('로그아웃 실패');
            }
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
    }

    // --- 3. 시스템 상태 관리 ---

    /** 시스템 상태 로딩 */
    async function loadSystemStatus() {
        try {
            const response = await fetch('/api/admin/system-status', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                window.location.href = '/login.html';
                return;
            }
            
            if (response.status === 403) {
                alert('관리자 권한이 필요합니다.');
                window.location.href = '/index.html';
                return;
            }
            
            if (!response.ok) {
                throw new Error('시스템 상태 로딩 실패');
            }
            
            const data = await response.json();
            console.log('시스템 상태:', data);
            
            updateSystemStatus(data);
            
        } catch (error) {
            console.error('시스템 상태 로딩 오류:', error);
            showError('시스템 상태를 불러오는데 실패했습니다.');
        }
    }

    /** 시스템 상태 업데이트 */
    function updateSystemStatus(data) {
        // 서버 업타임
        const uptimeElement = document.getElementById('server-uptime');
        if (uptimeElement) {
            uptimeElement.textContent = formatUptime(data.server.uptime);
        }
        
        // 메모리 사용량
        const memoryElement = document.getElementById('memory-usage');
        if (memoryElement) {
            memoryElement.textContent = `${data.memory.usagePercent}% (${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)})`;
        }
        
        // 데이터베이스 크기
        const dbSizeElement = document.getElementById('database-size');
        if (dbSizeElement) {
            dbSizeElement.textContent = data.database.sizeFormatted;
        }
        
        // Node.js 버전
        const nodeVersionElement = document.getElementById('node-version');
        if (nodeVersionElement) {
            nodeVersionElement.textContent = data.server.nodeVersion;
        }
    }

    /** 업타임 포맷팅 */
    function formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /** 바이트 포맷팅 */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // --- 4. 백업 관리 ---

    /** 백업 생성 */
    async function createBackup() {
        const backupBtn = document.getElementById('create-backup-btn');
        const backupStatus = document.getElementById('backup-status');
        
        try {
            // 버튼 비활성화
            backupBtn.disabled = true;
            backupBtn.innerHTML = '<span class="btn-icon">⏳</span> Creating...';
            
            // 상태 표시
            backupStatus.innerHTML = '<div class="loading">백업을 생성하는 중...</div>';
            backupStatus.className = 'backup-status loading';
            
            const response = await fetch('/api/admin/backup', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                backupStatus.innerHTML = `
                    <div class="backup-success">
                        <strong>✅ 백업 완료!</strong><br>
                        <small>백업 시간: ${new Date(result.timestamp).toLocaleString()}</small>
                    </div>
                `;
                backupStatus.className = 'backup-status success';
            } else {
                const error = await response.json();
                throw new Error(error.message || '백업 생성 실패');
            }
            
        } catch (error) {
            console.error('백업 생성 오류:', error);
            backupStatus.innerHTML = `
                <div class="backup-error">
                    <strong>❌ 백업 실패</strong><br>
                    <small>${error.message}</small>
                </div>
            `;
            backupStatus.className = 'backup-status error';
        } finally {
            // 버튼 복원
            backupBtn.disabled = false;
            backupBtn.innerHTML = '<span class="btn-icon">💾</span> Create Backup';
        }
    }

    // --- 5. 로그 관리 ---

    /** 로그 로딩 */
    async function loadLogs() {
        const logsList = document.getElementById('logs-list');
        const loadLogsBtn = document.getElementById('load-logs-btn');
        
        try {
            // 버튼 비활성화
            loadLogsBtn.disabled = true;
            loadLogsBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
            
            // 로딩 표시
            logsList.innerHTML = '<div class="loading">로그를 불러오는 중...</div>';
            
            const response = await fetch('/api/admin/logs', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                renderLogs(data.logs);
            } else {
                throw new Error('로그 로딩 실패');
            }
            
        } catch (error) {
            console.error('로그 로딩 오류:', error);
            logsList.innerHTML = `
                <div class="empty-state">
                    <h4>로그 로딩 실패</h4>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            // 버튼 복원
            loadLogsBtn.disabled = false;
            loadLogsBtn.innerHTML = '<span class="btn-icon">📋</span> Load Logs';
        }
    }

    /** 로그 렌더링 */
    function renderLogs(logs) {
        const logsList = document.getElementById('logs-list');
        
        if (logs.length === 0) {
            logsList.innerHTML = `
                <div class="empty-state">
                    <h4>No Logs Available</h4>
                    <p>No system logs found.</p>
                </div>
            `;
            return;
        }
        
        logsList.innerHTML = '';
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            // 로그 레벨에 따른 클래스 추가
            if (log.content.toLowerCase().includes('error')) {
                logEntry.classList.add('error');
            } else if (log.content.toLowerCase().includes('warning')) {
                logEntry.classList.add('warning');
            } else if (log.content.toLowerCase().includes('info')) {
                logEntry.classList.add('info');
            }
            
            logEntry.innerHTML = `
                <span class="log-timestamp">[${new Date(log.timestamp).toLocaleString()}]</span>
                <span class="log-content">${log.content}</span>
            `;
            
            logsList.appendChild(logEntry);
        });
        
        // 스크롤을 맨 아래로
        logsList.scrollTop = logsList.scrollHeight;
    }

    /** 로그 표시 초기화 */
    function clearLogs() {
        const logsList = document.getElementById('logs-list');
        logsList.innerHTML = `
            <div class="empty-state">
                <h4>Logs Cleared</h4>
                <p>Click "Load Logs" to view system logs.</p>
            </div>
        `;
    }

    // --- 6. 유틸리티 함수 ---

    /** 에러 표시 */
    function showError(message) {
        const container = document.querySelector('.container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        `;
        errorDiv.textContent = message;
        container.insertBefore(errorDiv, container.firstChild);
        
        // 5초 후 에러 메시지 제거
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // --- 7. 이벤트 리스너 ---

    /** 로그아웃 버튼 이벤트 */
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    /** 백업 생성 버튼 이벤트 */
    const createBackupBtn = document.getElementById('create-backup-btn');
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', createBackup);
    }

    /** 상태 새로고침 버튼 이벤트 */
    const refreshStatusBtn = document.getElementById('refresh-status-btn');
    if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', loadSystemStatus);
    }

    /** 로그 로딩 버튼 이벤트 */
    const loadLogsBtn = document.getElementById('load-logs-btn');
    if (loadLogsBtn) {
        loadLogsBtn.addEventListener('click', loadLogs);
    }

    /** 로그 초기화 버튼 이벤트 */
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearLogs);
    }

    // --- 8. 초기 실행 ---
    checkAuthStatus();
    loadSystemStatus();
    
    // 30초마다 시스템 상태 자동 새로고침
    systemStatusInterval = setInterval(loadSystemStatus, 30000);
    
    // 페이지 언로드 시 인터벌 정리
    window.addEventListener('beforeunload', () => {
        if (systemStatusInterval) {
            clearInterval(systemStatusInterval);
        }
    });
});
