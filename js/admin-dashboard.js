// js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 전역 변수 ---
    let genreChart = null;
    let userChart = null;

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

    // --- 3. 대시보드 데이터 로딩 ---

    /** 대시보드 데이터 로딩 */
    async function loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard', {
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
        document.getElementById('total-users').textContent = overview.totalUsers;
        document.getElementById('total-songs').textContent = overview.totalSongs;
        document.getElementById('total-playlists').textContent = overview.totalPlaylists;
        document.getElementById('public-songs').textContent = overview.publicSongs;
    }

    /** 장르 차트 생성 */
    function createGenreChart(genreStats) {
        const ctx = document.getElementById('genre-chart').getContext('2d');
        
        // 기존 차트가 있으면 제거
        if (genreChart) {
            genreChart.destroy();
        }
        
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
            '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
        ];
        
        genreChart = new Chart(ctx, {
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
        const ctx = document.getElementById('user-chart').getContext('2d');
        
        // 기존 차트가 있으면 제거
        if (userChart) {
            userChart.destroy();
        }
        
        // 상위 5명만 표시
        const topUsers = userStats.slice(0, 5);
        
        userChart = new Chart(ctx, {
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

    // --- 4. 이벤트 리스너 ---

    /** 로그아웃 버튼 이벤트 */
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    /** 데이터 새로고침 버튼 이벤트 */
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.innerHTML = `
                <div class="action-icon">⏳</div>
                <div class="action-text">Refreshing...</div>
            `;
            refreshBtn.disabled = true;
            
            loadDashboardData().finally(() => {
                refreshBtn.innerHTML = `
                    <div class="action-icon">🔄</div>
                    <div class="action-text">Refresh Data</div>
                `;
                refreshBtn.disabled = false;
            });
        });
    }

    // --- 5. 초기 실행 ---
    checkAuthStatus();
    loadDashboardData();
});
