// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 전역 변수 ---
    const songListElement = document.getElementById('song-management-list');
    const addSongForm = document.getElementById('add-song-form');
    const toggleAddFormBtn = document.getElementById('toggle-add-form-btn');
    const addFormContainer = document.getElementById('add-song-form-container');
    const cancelAddBtn = document.getElementById('cancel-add-btn');

    // --- 2. 핵심 함수 ---
    
    // 날짜 형식 검증 및 포맷팅
    function formatDateInput(input) {
        let value = input.value.replace(/[^0-9]/g, ''); // 숫자만 추출
        
        if (value.length >= 4) {
            value = value.substring(0, 4) + '.' + value.substring(4);
        }
        if (value.length >= 7) {
            value = value.substring(0, 7) + '.' + value.substring(7, 9);
        }
        
        input.value = value;
    }
    
    // 날짜 형식 검증
    function validateDate(dateString) {
        const datePattern = /^(\d{4})\.(\d{2})\.(\d{2})$/;
        const match = dateString.match(datePattern);
        
        if (!match) {
            return { isValid: false, message: 'YYYY.MM.DD 형식으로 입력하세요 (예: 2025.01.01)' };
        }
        
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        
        // 기본 범위 검증
        if (year < 1900 || year > 2100) {
            return { isValid: false, message: '연도는 1900-2100 사이여야 합니다.' };
        }
        if (month < 1 || month > 12) {
            return { isValid: false, message: '월은 01-12 사이여야 합니다.' };
        }
        if (day < 1 || day > 31) {
            return { isValid: false, message: '일은 01-31 사이여야 합니다.' };
        }
        
        // 실제 날짜 유효성 검증
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return { isValid: false, message: '유효하지 않은 날짜입니다.' };
        }
        
        return { isValid: true, message: '' };
    }
    
    // 사용자 권한에 따른 UI 텍스트 업데이트
    function updateUITextForUser(isAdmin, username) {
        const pageTitle = document.querySelector('h1');
        const pageDescription = document.querySelector('p');
        const sectionTitle = document.querySelector('.section-title');
        
        if (isAdmin) {
            // 관리자인 경우
            document.title = '관리자 페이지 - Music Space V2';
            pageTitle.textContent = '관리자 페이지';
            pageDescription.textContent = '모든 노래를 추가, 수정, 삭제할 수 있습니다.';
            sectionTitle.textContent = 'My Song List';
        } else {
            // 일반 사용자인 경우
            document.title = '나의 노래 관리 - Music Space V2';
            pageTitle.textContent = '나의 노래 관리';
            pageDescription.textContent = `${username}님의 노래를 추가, 수정, 삭제할 수 있습니다.`;
            sectionTitle.textContent = 'My Song List';
        }
    }
    
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
            
            // 사용자 권한에 따른 UI 텍스트 변경
            updateUITextForUser(isAdmin, userData.user.username);
            
            // 관리자면 모든 노래, 일반 사용자면 본인 노래만 가져오기
            const apiEndpoint = isAdmin ? '/api/songs/admin' : '/api/songs/my';
            console.log('API 엔드포인트:', apiEndpoint, '관리자 여부:', isAdmin);
            const response = await fetch(apiEndpoint, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('서버 응답 오류');
            
            const songs = await response.json();
            console.log('관리자 페이지 - 받은 노래 데이터:', songs);
            console.log('총 노래 개수:', songs.length);
            
            songListElement.innerHTML = '';
            songs.forEach(song => {
                console.log('노래 렌더링:', song.title, '공개여부:', song.isPublic, '업로더:', song.User?.username);
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
        // 날짜 입력 필드 이벤트
        const dateInput = document.getElementById('date');
        if (dateInput) {
            // 실시간 포맷팅
            dateInput.addEventListener('input', (e) => {
                formatDateInput(e.target);
            });
            
            // 포커스 아웃 시 검증
            dateInput.addEventListener('blur', (e) => {
                const validation = validateDate(e.target.value);
                if (!validation.isValid) {
                    e.target.style.borderColor = '#e74c3c';
                    e.target.title = validation.message;
                } else {
                    e.target.style.borderColor = '#27ae60';
                    e.target.title = '';
                }
            });
            
            // 포커스 시 스타일 초기화
            dateInput.addEventListener('focus', (e) => {
                e.target.style.borderColor = '';
                e.target.title = '';
            });
        }
        
        // 폼 제출 이벤트
        addSongForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // 날짜 검증
            const dateInput = document.getElementById('date');
            const dateValidation = validateDate(dateInput.value);
            if (!dateValidation.isValid) {
                alert(dateValidation.message);
                dateInput.focus();
                return;
            }
            
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
                    // 폼 닫기
                    cancelAddForm();
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
                console.log('로그인 상태:', data.user.username, '관리자:', data.user.isAdmin);
                
                // 로그인된 상태 - 상단 사용자 정보 영역 표시
                document.getElementById('user-info').style.display = 'flex';
                document.getElementById('username').textContent = data.user.username;
                document.getElementById('login-link').style.display = 'none';
                
            } else {
                console.log('로그인되지 않은 상태');
                
                // 로그인되지 않은 상태 - 상단 사용자 정보 영역 숨김
                document.getElementById('user-info').style.display = 'none';
                document.getElementById('login-link').style.display = 'inline-block';
            }
        } catch (error) {
            console.error('인증 상태 확인 오류:', error);
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('login-link').style.display = 'inline-block';
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
                // UI 상태 업데이트
                document.getElementById('user-info').style.display = 'none';
                document.getElementById('login-link').style.display = 'inline-block';
                
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

    // --- 6. 폼 토글 기능 ---
    
    /** 새 노래 추가 폼 토글 */
    function toggleAddForm() {
        if (addFormContainer.style.display === 'none' || addFormContainer.style.display === '') {
            addFormContainer.style.display = 'block';
            toggleAddFormBtn.textContent = 'Close Form';
            toggleAddFormBtn.style.background = '#e74c3c';
        } else {
            addFormContainer.style.display = 'none';
            toggleAddFormBtn.textContent = 'Add a New Song';
            toggleAddFormBtn.style.background = '#3498db';
            // 폼 리셋
            addSongForm.reset();
        }
    }
    
    /** 폼 취소 */
    function cancelAddForm() {
        addFormContainer.style.display = 'none';
        toggleAddFormBtn.textContent = 'Add a New Song';
        toggleAddFormBtn.style.background = '#3498db';
        addSongForm.reset();
    }

    // --- 7. 초기 실행 ---
    checkAuthStatus();
    fetchAndRenderSongs();
    setupEventListeners();
    
    // URL 파라미터 확인하여 폼 자동 열기
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openForm') === 'true') {
        // 페이지 로딩 완료 후 폼 열기
        setTimeout(() => {
            toggleAddForm();
        }, 500);
    }
    
    // 이벤트 리스너들
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // 새 노래 추가 폼 토글 버튼
    if (toggleAddFormBtn) {
        toggleAddFormBtn.addEventListener('click', toggleAddForm);
    }
    
    // 취소 버튼
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', cancelAddForm);
    }
});