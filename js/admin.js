// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 전역 변수 ---
    const songListElement = document.getElementById('song-management-list');
    const addSongForm = document.getElementById('add-song-form');

    // --- 2. 핵심 함수 ---
    async function fetchAndRenderSongs() {
        try {
            // 먼저 사용자 정보를 확인하여 관리자인지 체크
            const userResponse = await fetch('/api/user', {
                credentials: 'include'
            });
            
            if (userResponse.status === 401) {
                alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                window.location.href = '/login.html';
                return;
            }
            
            if (!userResponse.ok) throw new Error('사용자 정보를 가져올 수 없습니다.');
            
            const userData = await userResponse.json();
            const isAdmin = userData.user.isAdmin;
            
            // 관리자면 모든 노래, 일반 사용자면 본인 노래만 가져오기
            const apiEndpoint = isAdmin ? '/api/songs/admin' : '/api/songs/my';
            const response = await fetch(apiEndpoint, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('서버 응답 오류');
            
            const songs = await response.json();
            
            songListElement.innerHTML = '';
            songs.forEach(song => {
                const listItem = document.createElement('li');
                listItem.className = 'song-item';
                
                // 관리자인 경우 업로더 정보도 표시
                const uploaderInfo = isAdmin && song.User ? 
                    `<span class="uploader-info">업로더: ${song.User.username}</span>` : '';
                
                listItem.innerHTML = `
                    <div class="song-info">
                        <span class="song-title">${song.title}</span>
                        <span class="song-artist">${song.artist}</span>
                        <span class="privacy-badge ${song.isPublic ? 'public' : 'private'}">
                            ${song.isPublic ? '공개' : '비공개'}
                        </span>
                        ${uploaderInfo}
                    </div>
                    <div class="buttons">
                        <button class="btn-edit" data-id="${song.id}" data-is-admin="${isAdmin}">수정</button>
                        <button class="btn-delete" data-id="${song.id}" data-is-admin="${isAdmin}">삭제</button>
                    </div>
                `;
                songListElement.appendChild(listItem);
            });
        } catch (error) {
            console.error("노래 목록을 가져오는 데 실패했습니다:", error);
        }
    }

    // --- 3. 이벤트 처리 ---
    function setupEventListeners() {
        // 폼 제출 이벤트
        addSongForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(addSongForm);
            try {
                const response = await fetch('/api/songs', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                
                if (response.status === 401) {
                    alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                    window.location.href = '/login.html';
                    return;
                }
                
                if (response.ok) {
                    alert('노래가 성공적으로 추가되었습니다!');
                    addSongForm.reset();
                    fetchAndRenderSongs();
                } else {
                    alert('업로드에 실패했습니다.');
                }
            } catch (error) {
                console.error('노래 추가 중 오류:', error);
                alert('서버와 통신 중 오류가 발생했습니다.');
            }
        });

        // 목록 내 클릭 이벤트 (수정/삭제)
        songListElement.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('.btn-edit')) {
                const songId = target.dataset.id;
                const isAdmin = target.dataset.isAdmin === 'true';
                window.location.href = `edit.html?id=${songId}&admin=${isAdmin}`;
            }
            if (target.matches('.btn-delete')) {
                const songId = target.dataset.id;
                const isAdmin = target.dataset.isAdmin === 'true';
                if (confirm(`정말로 이 노래를 삭제하시겠습니까?`)) {
                    const deleteEndpoint = isAdmin ? `/api/songs/${songId}/admin` : `/api/songs/${songId}`;
                    fetch(deleteEndpoint, { 
                        method: 'DELETE',
                        credentials: 'include'
                    })
                        .then(response => {
                            if (response.ok) {
                                fetchAndRenderSongs();
                            } else {
                                alert('삭제에 실패했습니다.');
                            }
                        })
                        .catch(error => console.error('삭제 중 오류:', error));
                }
            }
        });
    }

    // --- 4. 인증 상태 확인 ---
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/user', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                document.getElementById('login-link').style.display = 'none';
                document.getElementById('logout-btn').style.display = 'inline-block';
            } else {
                document.getElementById('login-link').style.display = 'inline-block';
                document.getElementById('logout-btn').style.display = 'none';
            }
        } catch (error) {
            console.error('인증 상태 확인 오류:', error);
            document.getElementById('login-link').style.display = 'inline-block';
            document.getElementById('logout-btn').style.display = 'none';
        }
    }

    // --- 5. 로그아웃 기능 ---
    async function logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                document.getElementById('login-link').style.display = 'inline-block';
                document.getElementById('logout-btn').style.display = 'none';
                alert('로그아웃되었습니다.');
                window.location.reload();
            } else {
                alert('로그아웃에 실패했습니다.');
            }
        } catch (error) {
            console.error('로그아웃 오류:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    }

    // --- 6. 초기 실행 ---
    checkAuthStatus();
    fetchAndRenderSongs();
    setupEventListeners();
    
    // 로그아웃 버튼 이벤트
    document.getElementById('logout-btn').addEventListener('click', logout);
});