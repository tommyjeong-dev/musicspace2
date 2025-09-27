// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 전역 변수 ---
    const songListElement = document.getElementById('song-management-list');
    const addSongForm = document.getElementById('add-song-form');
    const toggleAddFormBtn = document.getElementById('toggle-add-form-btn');
    const addFormContainer = document.getElementById('add-song-form-container');
    const cancelAddBtn = document.getElementById('cancel-add-btn');
    
    // 고급 노래 관리 변수들
    const songSearchInput = document.getElementById('song-search-input');
    const genreFilter = document.getElementById('genre-filter');
    const privacyFilter = document.getElementById('privacy-filter');
    const searchSongsBtn = document.getElementById('search-songs-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const bulkPublicBtn = document.getElementById('bulk-public-btn');
    const bulkPrivateBtn = document.getElementById('bulk-private-btn');
    const totalSongsElement = document.getElementById('total-songs');
    const selectedCountElement = document.getElementById('selected-count');
    
    let allSongs = []; // 모든 노래 데이터
    let filteredSongs = []; // 필터링된 노래 데이터
    let selectedSongs = new Set(); // 선택된 노래 ID들

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
            
            allSongs = await response.json();
            console.log('관리자 페이지 - 받은 노래 데이터:', allSongs);
            console.log('총 노래 개수:', allSongs.length);
            
            filteredSongs = [...allSongs]; // 초기에는 모든 노래 표시
            renderSongs();
            updateStats();
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

        // 목록 내 클릭 이벤트 (재생/수정/삭제)
        songListElement.addEventListener('click', (event) => {
            const target = event.target;
            
            // 재생 버튼
            if (target.matches('.btn-play')) {
                const src = target.dataset.src;
                const songTitle = target.closest('li').querySelector('.song-title').textContent;
                const playingRow = document.querySelector('li.playing');
                if (playingRow) playingRow.classList.remove('playing');
                target.closest('li').classList.add('playing');
                window.globalAudioPlayer.play(src, songTitle);
            }
            
            if (target.matches('.btn-edit')) {
                const songId = target.dataset.songId || target.dataset.id;
                const isAdmin = target.dataset.isAdmin === 'true';
                window.location.href = `edit.html?id=${songId}&admin=${isAdmin}`;
            }
            if (target.matches('.btn-delete')) {
                const songId = target.dataset.songId || target.dataset.id;
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
                
                // 사용자 권한 정보를 body에 설정
                document.body.dataset.isAdmin = data.user.isAdmin.toString();
                
                // 로그인된 상태 - 상단 사용자 정보 영역 표시
                document.getElementById('user-info').style.display = 'flex';
                document.getElementById('username').textContent = data.user.username;
                document.getElementById('login-link').style.display = 'none';
                
                // 관리자 전용 버튼들 표시/숨김
                const adminOnlyButtons = document.querySelectorAll('.admin-only');
                adminOnlyButtons.forEach(button => {
                    button.style.display = data.user.isAdmin ? 'inline-block' : 'none';
                });
                
            } else {
                console.log('로그인되지 않은 상태');
                
                // 사용자 권한 정보를 body에 설정
                document.body.dataset.isAdmin = 'false';
                
                // 로그인되지 않은 상태 - 상단 사용자 정보 영역 숨김
                document.getElementById('user-info').style.display = 'none';
                document.getElementById('login-link').style.display = 'inline-block';
                
                // 관리자 전용 버튼들 숨김
                const adminOnlyButtons = document.querySelectorAll('.admin-only');
                adminOnlyButtons.forEach(button => {
                    button.style.display = 'none';
                });
            }
        } catch (error) {
            console.error('인증 상태 확인 오류:', error);
            document.body.dataset.isAdmin = 'false';
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('login-link').style.display = 'inline-block';
            
            // 관리자 전용 버튼들 숨김
            const adminOnlyButtons = document.querySelectorAll('.admin-only');
            adminOnlyButtons.forEach(button => {
                button.style.display = 'none';
            });
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

    // --- 8. 고급 노래 관리 함수들 ---

    /** 노래 검색 및 필터링 */
    function filterSongs() {
        const searchTerm = songSearchInput.value.toLowerCase();
        const selectedGenre = genreFilter.value;
        const selectedPrivacy = privacyFilter.value;

        filteredSongs = allSongs.filter(song => {
            // 텍스트 검색
            const matchesSearch = !searchTerm || 
                song.title.toLowerCase().includes(searchTerm) ||
                song.artist.toLowerCase().includes(searchTerm) ||
                song.composer.toLowerCase().includes(searchTerm);

            // 장르 필터
            const matchesGenre = !selectedGenre || song.genre === selectedGenre;

            // 공개 설정 필터
            const matchesPrivacy = !selectedPrivacy || song.isPublic.toString() === selectedPrivacy;

            return matchesSearch && matchesGenre && matchesPrivacy;
        });

        renderSongs();
        updateStats();
    }

    /** 노래 목록 렌더링 (체크박스 포함) */
    function renderSongs() {
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
                        <button class="btn-play" data-src="${song.src}">재생</button>
                        <button class="btn-edit" data-song-id="${song.id}" data-is-admin="true">수정</button>
                        <button class="btn-delete" data-song-id="${song.id}" data-is-admin="true">삭제</button>
                    </div>
                </div>
            `;
            songListElement.appendChild(li);
        });
    }

    /** 통계 업데이트 */
    function updateStats() {
        totalSongsElement.textContent = `총 노래: ${filteredSongs.length}`;
        selectedCountElement.textContent = `선택됨: ${selectedSongs.size}`;
        
        // 대량 작업 버튼 활성화/비활성화
        const hasSelection = selectedSongs.size > 0;
        bulkDeleteBtn.disabled = !hasSelection;
        bulkPublicBtn.disabled = !hasSelection;
        bulkPrivateBtn.disabled = !hasSelection;
    }

    /** 전체 선택/해제 */
    function toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.song-checkbox');
        const allSelected = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allSelected;
            const songId = parseInt(checkbox.dataset.songId);
            if (!allSelected) {
                selectedSongs.add(songId);
            } else {
                selectedSongs.delete(songId);
            }
        });
        
        updateStats();
        selectAllBtn.textContent = allSelected ? '전체 선택' : '전체 해제';
    }

    /** 대량 삭제 */
    async function bulkDeleteSongs() {
        if (selectedSongs.size === 0) return;
        
        if (!confirm(`선택된 ${selectedSongs.size}개의 노래를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        try {
            // 사용자 권한에 따라 다른 API 엔드포인트 사용
            const isAdmin = document.body.dataset.isAdmin === 'true';
            const endpoint = isAdmin ? '/admin' : '';
            
            const deletePromises = Array.from(selectedSongs).map(songId => 
                fetch(`/api/songs/${songId}${endpoint}`, {
                    method: 'DELETE',
                    credentials: 'include'
                })
            );

            const results = await Promise.all(deletePromises);
            const failed = results.filter(r => !r.ok).length;
            
            if (failed === 0) {
                alert(`${selectedSongs.size}개의 노래가 성공적으로 삭제되었습니다.`);
            } else {
                alert(`${selectedSongs.size - failed}개의 노래가 삭제되었습니다. ${failed}개의 노래 삭제에 실패했습니다.`);
            }
            
            selectedSongs.clear();
            await fetchAndRenderSongs();
            
        } catch (error) {
            console.error('대량 삭제 오류:', error);
            alert('대량 삭제 중 오류가 발생했습니다.');
        }
    }

    /** 대량 공개/비공개 변경 */
    async function bulkChangePrivacy(isPublic) {
        if (selectedSongs.size === 0) return;
        
        const action = isPublic ? '공개' : '비공개';
        if (!confirm(`선택된 ${selectedSongs.size}개의 노래를 ${action}로 변경하시겠습니까?`)) {
            return;
        }

        try {
            // 사용자 권한에 따라 다른 API 엔드포인트 사용
            const isAdmin = document.body.dataset.isAdmin === 'true';
            const endpoint = isAdmin ? '/admin' : '';
            
            const updatePromises = Array.from(selectedSongs).map(songId => 
                fetch(`/api/songs/${songId}${endpoint}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ isPublic: isPublic }),
                    credentials: 'include'
                })
            );

            const results = await Promise.all(updatePromises);
            const failed = results.filter(r => !r.ok).length;
            
            if (failed === 0) {
                alert(`${selectedSongs.size}개의 노래가 성공적으로 ${action}로 변경되었습니다.`);
            } else {
                alert(`${selectedSongs.size - failed}개의 노래가 ${action}로 변경되었습니다. ${failed}개의 노래 변경에 실패했습니다.`);
            }
            
            selectedSongs.clear();
            await fetchAndRenderSongs();
            
        } catch (error) {
            console.error('대량 변경 오류:', error);
            alert('대량 변경 중 오류가 발생했습니다.');
        }
    }

    /** 필터 초기화 */
    function clearFilters() {
        songSearchInput.value = '';
        genreFilter.value = '';
        privacyFilter.value = '';
        selectedSongs.clear();
        filterSongs();
    }

    // --- 9. 고급 노래 관리 이벤트 리스너 ---

    // 검색 및 필터 이벤트
    if (searchSongsBtn) {
        searchSongsBtn.addEventListener('click', filterSongs);
    }
    
    if (songSearchInput) {
        songSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') filterSongs();
        });
    }
    
    if (genreFilter) {
        genreFilter.addEventListener('change', filterSongs);
    }
    
    if (privacyFilter) {
        privacyFilter.addEventListener('change', filterSongs);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }

    // 대량 작업 이벤트
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAll);
    }
    
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', bulkDeleteSongs);
    }
    
    if (bulkPublicBtn) {
        bulkPublicBtn.addEventListener('click', () => bulkChangePrivacy(true));
    }
    
    if (bulkPrivateBtn) {
        bulkPrivateBtn.addEventListener('click', () => bulkChangePrivacy(false));
    }

    // 체크박스 선택 이벤트
    songListElement.addEventListener('change', (event) => {
        if (event.target.classList.contains('song-checkbox')) {
            const songId = parseInt(event.target.dataset.songId);
            if (event.target.checked) {
                selectedSongs.add(songId);
            } else {
                selectedSongs.delete(songId);
            }
            updateStats();
        }
    });
});