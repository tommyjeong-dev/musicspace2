// js/admin-main.js - 통합 관리자 패널

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 전역 변수 ---
    let currentTab = 'dashboard';
    let genreChart = null;
    let userChart = null;
    let systemStatusInterval = null;
    
    // 노래 관리 관련 변수들
    let allSongs = [];
    let filteredSongs = [];
    let selectedSongs = new Set();

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
                
                // 로그인된 상태 - 사용자 정보 표시
                const userInfoEl = document.getElementById('user-info');
                const usernameEl = document.getElementById('username');
                const userInitialEl = document.getElementById('user-initial');
                
                if (userInfoEl && usernameEl && userInitialEl) {
                    userInfoEl.style.display = 'flex';
                    usernameEl.textContent = data.user.username;
                    userInitialEl.textContent = data.user.username.charAt(0).toUpperCase();
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

    // --- 3. 탭 관리 ---

    /** 탭 전환 */
    function switchTab(tabName) {
        // 모든 탭 콘텐츠 숨기기
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 모든 메뉴 아이템 비활성화
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 선택된 탭 활성화
        const targetTab = document.getElementById(`${tabName}-tab`);
        const targetMenuItem = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (targetTab && targetMenuItem) {
            targetTab.classList.add('active');
            targetMenuItem.classList.add('active');
            currentTab = tabName;
            
            // 탭별 데이터 로딩
            loadTabData(tabName);
        }
    }

    /** 탭별 데이터 로딩 */
    async function loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'songs':
                await loadSongsData();
                break;
            case 'users':
                await loadUsersData();
                break;
            case 'system':
                await loadSystemData();
                break;
        }
    }

    // --- 4. 대시보드 기능 ---

    /** 대시보드 데이터 로딩 */
    async function loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('대시보드 데이터 로딩 실패');
            }
            
            const data = await response.json();
            console.log('대시보드 데이터:', data);
            
            // 통계 카드 업데이트
            updateStatsCards(data.overview);
            
            // 차트 생성
            createGenreChart(data.genreStats);
            createUserChart(data.userStats);
            
            // 최근 활동 업데이트
            updateRecentActivity(data.recentSongs);
            
        } catch (error) {
            console.error('대시보드 데이터 로딩 오류:', error);
            showError('대시보드 데이터를 불러오는데 실패했습니다.');
        }
    }

    /** 통계 카드 업데이트 */
    function updateStatsCards(overview) {
        const elements = {
            'total-users': overview.totalUsers,
            'total-songs': overview.totalSongs,
            'total-playlists': overview.totalPlaylists,
            'public-songs': overview.publicSongs
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /** 장르 차트 생성 */
    function createGenreChart(genreStats) {
        const ctx = document.getElementById('genre-chart');
        if (!ctx) return;
        
        // 기존 차트가 있으면 제거
        if (genreChart) {
            genreChart.destroy();
        }
        
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
            '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
        ];
        
        genreChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: genreStats.map(stat => stat.genre),
                datasets: [{
                    data: genreStats.map(stat => stat.count),
                    backgroundColor: colors.slice(0, genreStats.length),
                    borderColor: '#2c2c2c',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e8f4fd'
                        }
                    }
                }
            }
        });
    }

    /** 사용자 활동 차트 생성 */
    function createUserChart(userStats) {
        const ctx = document.getElementById('user-chart');
        if (!ctx) return;
        
        // 기존 차트가 있으면 제거
        if (userChart) {
            userChart.destroy();
        }
        
        // 상위 5명만 표시
        const topUsers = userStats.slice(0, 5);
        
        userChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: topUsers.map(user => user.username),
                datasets: [{
                    label: 'Songs Uploaded',
                    data: topUsers.map(user => user.songCount),
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: '#3498db',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e8f4fd'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#e8f4fd'
                        },
                        grid: {
                            color: '#555'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#e8f4fd'
                        },
                        grid: {
                            color: '#555'
                        }
                    }
                }
            }
        });
    }

    /** 최근 활동 업데이트 */
    function updateRecentActivity(recentSongs) {
        const activityList = document.getElementById('recent-songs-list');
        if (!activityList) return;
        
        if (recentSongs.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <h4>No Recent Activity</h4>
                    <p>No songs have been uploaded recently.</p>
                </div>
            `;
            return;
        }
        
        activityList.innerHTML = '';
        recentSongs.forEach(song => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            const timeAgo = getTimeAgo(new Date(song.createdAt));
            
            activityItem.innerHTML = `
                <div class="activity-icon">🎵</div>
                <div class="activity-content">
                    <div class="activity-title">${song.title}</div>
                    <div class="activity-meta">
                        <span>Artist: ${song.artist || 'N/A'}</span>
                        <span>Genre: ${song.genre || 'N/A'}</span>
                        <span>Uploader: ${song.uploader}</span>
                        <span class="activity-badge ${song.isPublic ? 'public' : 'private'}">
                            ${song.isPublic ? 'Public' : 'Private'}
                        </span>
                    </div>
                </div>
                <div class="activity-time">${timeAgo}</div>
            `;
            
            activityList.appendChild(activityItem);
        });
    }

    // --- 5. 노래 관리 기능 ---

    /** 노래 데이터 로딩 */
    async function loadSongsData() {
        try {
            const response = await fetch('/api/songs/admin', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('노래 데이터 로딩 실패');
            }
            
            allSongs = await response.json();
            filteredSongs = [...allSongs];
            renderSongs();
            updateSongStats();
            
        } catch (error) {
            console.error('노래 데이터 로딩 오류:', error);
            showError('노래 데이터를 불러오는데 실패했습니다.');
        }
    }

    /** 노래 목록 렌더링 */
    function renderSongs() {
        const songListElement = document.getElementById('song-management-list');
        if (!songListElement) return;
        
        if (filteredSongs.length === 0) {
            songListElement.innerHTML = '<li style="text-align: center; color: #bbb; padding: 40px;">검색 결과가 없습니다.</li>';
            return;
        }

        songListElement.innerHTML = '';
        filteredSongs.forEach(song => {
            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" class="song-checkbox" data-song-id="${song.id}">
                <div class="song-info">
                    <div class="song-details">
                        <div class="song-title">${song.title}</div>
                        <div class="song-meta">
                            <span>아티스트: ${song.artist || 'N/A'}</span>
                            <span>장르: ${song.genre || 'N/A'}</span>
                            <span>발매일: ${song.date || 'N/A'}</span>
                            <span class="privacy-badge ${song.isPublic ? 'public' : 'private'}">${song.isPublic ? '공개' : '비공개'}</span>
                            ${song.User ? `<span>업로더: ${song.User.username}</span>` : ''}
                        </div>
                    </div>
                    <div class="song-actions">
                        <button class="btn-edit" data-song-id="${song.id}">수정</button>
                        <button class="btn-delete" data-song-id="${song.id}">삭제</button>
                    </div>
                </div>
            `;
            songListElement.appendChild(li);
        });
    }

    /** 노래 통계 업데이트 */
    function updateSongStats() {
        const totalSongsElement = document.getElementById('total-songs-count');
        const selectedCountElement = document.getElementById('selected-count');
        
        if (totalSongsElement) {
            totalSongsElement.textContent = `총 노래: ${filteredSongs.length}`;
        }
        
        if (selectedCountElement) {
            selectedCountElement.textContent = `선택됨: ${selectedSongs.size}`;
        }
        
        // 대량 작업 버튼 활성화/비활성화
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        const bulkPublicBtn = document.getElementById('bulk-public-btn');
        const bulkPrivateBtn = document.getElementById('bulk-private-btn');
        
        const hasSelection = selectedSongs.size > 0;
        if (bulkDeleteBtn) bulkDeleteBtn.disabled = !hasSelection;
        if (bulkPublicBtn) bulkPublicBtn.disabled = !hasSelection;
        if (bulkPrivateBtn) bulkPrivateBtn.disabled = !hasSelection;
    }

    // --- 6. 사용자 관리 기능 ---

    /** 사용자 데이터 로딩 */
    async function loadUsersData() {
        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('사용자 데이터 로딩 실패');
            }
            
            const users = await response.json();
            renderUsers(users);
            updateUserStats(users);
            
        } catch (error) {
            console.error('사용자 데이터 로딩 오류:', error);
            showError('사용자 데이터를 불러오는데 실패했습니다.');
        }
    }

    /** 사용자 목록 렌더링 */
    function renderUsers(users) {
        const usersListElement = document.getElementById('users-list');
        if (!usersListElement) return;
        
        if (users.length === 0) {
            usersListElement.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <h3>사용자가 없습니다</h3>
                        <p>아직 등록된 사용자가 없습니다.</p>
                    </td>
                </tr>
            `;
            return;
        }

        usersListElement.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                        <div class="user-details">
                            <div class="user-name">${user.username}</div>
                            <div class="user-id">ID: ${user.id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="role-badge ${user.isAdmin ? 'admin' : 'user'}">
                        ${user.isAdmin ? 'Admin' : 'User'}
                    </span>
                </td>
                <td>
                    <span class="song-count">${user.songCount} songs</span>
                </td>
                <td>
                    <span class="join-date">${formatDate(user.createdAt)}</span>
                </td>
                <td>
                    <div class="user-actions">
                        <select class="role-select" data-user-id="${user.id}" data-current-role="${user.isAdmin}">
                            <option value="false" ${!user.isAdmin ? 'selected' : ''}>User</option>
                            <option value="true" ${user.isAdmin ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn-action btn-delete-user" data-user-id="${user.id}" data-username="${user.username}">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            `;
            usersListElement.appendChild(row);
        });
    }

    /** 사용자 통계 업데이트 */
    function updateUserStats(users) {
        const totalUsersElement = document.getElementById('total-users-count');
        const adminCountElement = document.getElementById('admin-count');
        
        if (totalUsersElement) {
            totalUsersElement.textContent = `Total: ${users.length}`;
        }
        
        if (adminCountElement) {
            const adminCount = users.filter(user => user.isAdmin).length;
            adminCountElement.textContent = `Admins: ${adminCount}`;
        }
    }

    // --- 7. 시스템 관리 기능 ---

    /** 시스템 데이터 로딩 */
    async function loadSystemData() {
        try {
            await loadSystemStatus();
        } catch (error) {
            console.error('시스템 데이터 로딩 오류:', error);
            showError('시스템 데이터를 불러오는데 실패했습니다.');
        }
    }

    /** 시스템 상태 로딩 */
    async function loadSystemStatus() {
        try {
            const response = await fetch('/api/admin/system-status', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('시스템 상태 로딩 실패');
            }
            
            const data = await response.json();
            updateSystemStatus(data);
            
        } catch (error) {
            console.error('시스템 상태 로딩 오류:', error);
            showError('시스템 상태를 불러오는데 실패했습니다.');
        }
    }

    /** 시스템 상태 업데이트 */
    function updateSystemStatus(data) {
        const elements = {
            'server-uptime': formatUptime(data.server.uptime),
            'memory-usage': `${data.memory.usagePercent}% (${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)})`,
            'database-size': data.database.sizeFormatted,
            'node-version': data.server.nodeVersion
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // --- 8. 유틸리티 함수 ---

    /** 시간 경과 계산 */
    function getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
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

    /** 날짜 포맷팅 */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /** 에러 표시 */
    function showError(message) {
        const container = document.querySelector('.admin-main');
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

    // --- 9. 이벤트 리스너 ---

    /** 탭 메뉴 클릭 이벤트 */
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            if (tabName) {
                switchTab(tabName);
            }
        });
    });

    /** 로그아웃 버튼 이벤트 */
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // 노래 관리 이벤트 리스너들
    const songSearchInput = document.getElementById('song-search-input');
    const genreFilter = document.getElementById('genre-filter');
    const privacyFilter = document.getElementById('privacy-filter');
    const searchSongsBtn = document.getElementById('search-songs-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const bulkPublicBtn = document.getElementById('bulk-public-btn');
    const bulkPrivateBtn = document.getElementById('bulk-private-btn');

    // 검색 및 필터 이벤트
    if (searchSongsBtn) {
        searchSongsBtn.addEventListener('click', () => {
            // 검색 로직 구현
            console.log('검색 실행');
        });
    }

    if (songSearchInput) {
        songSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                // 검색 로직 구현
                console.log('엔터키 검색');
            }
        });
    }

    if (genreFilter) {
        genreFilter.addEventListener('change', () => {
            // 필터 로직 구현
            console.log('장르 필터 변경');
        });
    }

    if (privacyFilter) {
        privacyFilter.addEventListener('change', () => {
            // 필터 로직 구현
            console.log('공개 설정 필터 변경');
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            // 필터 초기화 로직 구현
            console.log('필터 초기화');
        });
    }

    // 대량 작업 이벤트
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            // 전체 선택 로직 구현
            console.log('전체 선택');
        });
    }

    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', () => {
            // 대량 삭제 로직 구현
            console.log('대량 삭제');
        });
    }

    if (bulkPublicBtn) {
        bulkPublicBtn.addEventListener('click', () => {
            // 대량 공개 로직 구현
            console.log('대량 공개');
        });
    }

    if (bulkPrivateBtn) {
        bulkPrivateBtn.addEventListener('click', () => {
            // 대량 비공개 로직 구현
            console.log('대량 비공개');
        });
    }

    // 체크박스 선택 이벤트
    document.addEventListener('change', (event) => {
        if (event.target.classList.contains('song-checkbox')) {
            const songId = parseInt(event.target.dataset.songId);
            if (event.target.checked) {
                selectedSongs.add(songId);
            } else {
                selectedSongs.delete(songId);
            }
            updateSongStats();
        }
    });

    // 사용자 관리 이벤트
    document.addEventListener('change', (event) => {
        if (event.target.classList.contains('role-select')) {
            const userId = event.target.dataset.userId;
            const currentRole = event.target.dataset.currentRole;
            const newRole = event.target.value;
            
            if (currentRole !== newRole) {
                // 권한 변경 로직 구현
                console.log('사용자 권한 변경:', userId, newRole);
            }
        }
    });

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-delete-user')) {
            const userId = event.target.dataset.userId;
            const username = event.target.dataset.username;
            
            if (confirm(`정말로 "${username}" 사용자를 삭제하시겠습니까?`)) {
                // 사용자 삭제 로직 구현
                console.log('사용자 삭제:', userId);
            }
        }
    });

    // 시스템 관리 이벤트
    const createBackupBtn = document.getElementById('create-backup-btn');
    const refreshStatusBtn = document.getElementById('refresh-status-btn');
    const loadLogsBtn = document.getElementById('load-logs-btn');
    const clearLogsBtn = document.getElementById('clear-logs-btn');

    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/admin/backup', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert('백업이 완료되었습니다.');
                } else {
                    throw new Error('백업 실패');
                }
            } catch (error) {
                console.error('백업 오류:', error);
                alert('백업 중 오류가 발생했습니다.');
            }
        });
    }

    if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', loadSystemStatus);
    }

    if (loadLogsBtn) {
        loadLogsBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/admin/logs', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // 로그 표시 로직 구현
                    console.log('로그 데이터:', data);
                } else {
                    throw new Error('로그 로딩 실패');
                }
            } catch (error) {
                console.error('로그 로딩 오류:', error);
                alert('로그를 불러오는데 실패했습니다.');
            }
        });
    }

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            const logsList = document.getElementById('logs-list');
            if (logsList) {
                logsList.innerHTML = '<div class="empty-state"><h4>Logs Cleared</h4><p>Click "Load Logs" to view system logs.</p></div>';
            }
        });
    }

    // --- 10. 초기 실행 ---
    checkAuthStatus();
    
    // 대시보드 데이터 로딩
    loadTabData('dashboard');
    
    // 30초마다 시스템 상태 자동 새로고침 (시스템 탭이 활성화된 경우에만)
    systemStatusInterval = setInterval(() => {
        if (currentTab === 'system') {
            loadSystemStatus();
        }
    }, 30000);
    
    // 페이지 언로드 시 인터벌 정리
    window.addEventListener('beforeunload', () => {
        if (systemStatusInterval) {
            clearInterval(systemStatusInterval);
        }
    });
});
