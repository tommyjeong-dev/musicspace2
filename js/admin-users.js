// js/admin-users.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 전역 변수 ---
    const usersListElement = document.getElementById('users-list');
    const totalUsersElement = document.getElementById('total-users');
    const adminCountElement = document.getElementById('admin-count');

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

    // --- 3. 사용자 관리 함수 ---

    /** 모든 사용자 목록 조회 */
    async function fetchAndRenderUsers() {
        try {
            usersListElement.innerHTML = '<tr><td colspan="6" class="loading">사용자 목록을 불러오는 중...</td></tr>';
            
            const response = await fetch('/api/admin/users', {
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
                throw new Error('사용자 목록 조회 실패');
            }
            
            const users = await response.json();
            renderUsers(users);
            updateStats(users);
            
        } catch (error) {
            console.error('사용자 목록 조회 오류:', error);
            usersListElement.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c;">사용자 목록을 불러오는데 실패했습니다.</td></tr>';
        }
    }

    /** 사용자 목록 렌더링 */
    function renderUsers(users) {
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

    /** 통계 업데이트 */
    function updateStats(users) {
        const totalUsers = users.length;
        const adminCount = users.filter(user => user.isAdmin).length;
        
        totalUsersElement.textContent = `Total: ${totalUsers}`;
        adminCountElement.textContent = `Admins: ${adminCount}`;
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

    /** 사용자 권한 변경 */
    async function changeUserRole(userId, newRole) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isAdmin: newRole === 'true' }),
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                // 사용자 목록 새로고침
                await fetchAndRenderUsers();
            } else {
                const error = await response.json();
                alert(error.message || '권한 변경에 실패했습니다.');
            }
        } catch (error) {
            console.error('사용자 권한 변경 오류:', error);
            alert('권한 변경 중 오류가 발생했습니다.');
        }
    }

    /** 사용자 삭제 */
    async function deleteUser(userId, username) {
        if (!confirm(`정말로 "${username}" 사용자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 사용자의 모든 노래와 플레이리스트도 함께 삭제됩니다.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                // 사용자 목록 새로고침
                await fetchAndRenderUsers();
            } else {
                const error = await response.json();
                alert(error.message || '사용자 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('사용자 삭제 오류:', error);
            alert('사용자 삭제 중 오류가 발생했습니다.');
        }
    }

    // --- 4. 이벤트 리스너 ---

    /** 역할 변경 드롭다운 이벤트 */
    usersListElement.addEventListener('change', async (event) => {
        if (event.target.classList.contains('role-select')) {
            const userId = event.target.dataset.userId;
            const currentRole = event.target.dataset.currentRole;
            const newRole = event.target.value;
            
            // 권한이 실제로 변경된 경우에만 API 호출
            if (currentRole !== newRole) {
                await changeUserRole(userId, newRole);
            }
        }
    });

    /** 사용자 삭제 버튼 이벤트 */
    usersListElement.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-delete-user')) {
            const userId = event.target.dataset.userId;
            const username = event.target.dataset.username;
            await deleteUser(userId, username);
        }
    });

    /** 로그아웃 버튼 이벤트 */
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // --- 5. 초기 실행 ---
    checkAuthStatus();
    fetchAndRenderUsers();
});
