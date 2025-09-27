document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 전역 변수 ---
    const playlistListEl = document.getElementById('playlist-list');
    const newPlaylistNameInput = document.getElementById('new-playlist-name');
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const songListInPlaylistEl = document.getElementById('song-list-in-playlist');
    
    // 노래 추가 관련 요소들
    const selectedPlaylistNameEl = document.getElementById('selected-playlist-name');
    const addSongToPlaylistBtn = document.getElementById('add-song-to-playlist-btn');
    const addSongModal = document.getElementById('add-song-modal');
    const songSearchInput = document.getElementById('song-search-input');
    const searchSongsBtn = document.getElementById('search-songs-btn');
    const availableSongsList = document.getElementById('available-songs-list');

    let activePlaylistId = null;
    let allSongs = []; // 모든 노래 데이터

    // --- 2. 핵심 로직 함수 ---

    /** 모든 플레이리스트를 받아와 왼쪽 목록을 그리고, 데이터를 반환하는 함수 */
async function fetchAndRenderPlaylists() {
    try {
        const response = await fetch('/api/playlists');
        const playlists = await response.json();
        
        playlistListEl.innerHTML = '';
        playlists.forEach(playlist => {
            const listItem = document.createElement('li');
            
            // --- 이 부분이 수정되었습니다 ---
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = playlist.name;
            link.dataset.id = playlist.id;
            
            if (playlist.id == activePlaylistId) {
                link.classList.add('active');
            }

            const linkContainer = document.createElement('div');
            linkContainer.className = 'playlist-item-link';
            linkContainer.appendChild(link);

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'playlist-buttons';
            buttonsContainer.innerHTML = `
                <button class="btn-edit-playlist" data-id="${playlist.id}" title="이름 수정">✏️</button>
                <button class="btn-delete-playlist" data-id="${playlist.id}" title="플레이리스트 삭제">🗑️</button>
            `;

            listItem.appendChild(linkContainer);
            listItem.appendChild(buttonsContainer);
            // --- 여기까지 ---

            playlistListEl.appendChild(listItem);
        });
        return playlists;
    } catch (error) {
        console.error('플레이리스트 렌더링 오류:', error);
        return [];
    }
}

    /** 특정 플레이리스트의 수록곡을 받아와 오른쪽 목록을 그리는 함수 */
    function renderSongsInPlaylist(playlist) {
        songListInPlaylistEl.innerHTML = '';

        if (!playlist.Songs || playlist.Songs.length === 0) {
            songListInPlaylistEl.innerHTML = '<li>수록곡이 없습니다.</li>';
            return;
        }

        playlist.Songs.forEach(song => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${song.title} - ${song.artist}</span>
                <button class="btn-delete" data-song-id="${song.id}">삭제</button>
            `;
            songListInPlaylistEl.appendChild(listItem);
        });
    }

    /** 특정 ID의 플레이리스트를 선택하는 로직을 처리하는 함수 */
    async function selectPlaylist(playlistId) {
        activePlaylistId = playlistId;
        await fetchAndRenderPlaylists(); // 활성화된 항목 표시를 위해 다시 렌더링

        try {
            const response = await fetch(`/api/playlists/${activePlaylistId}`);
            const playlistDetails = await response.json();
            
            // 플레이리스트 헤더 업데이트
            selectedPlaylistNameEl.textContent = playlistDetails.name;
            addSongToPlaylistBtn.style.display = 'inline-block';
            
            renderSongsInPlaylist(playlistDetails);
        } catch (error) {
            console.error('플레이리스트 상세 정보 로딩 오류:', error);
        }
    }

    // --- 3. 이벤트 리스너 설정 ---

    /** 새 플레이리스트 생성 버튼 클릭 이벤트 */
    createPlaylistBtn.addEventListener('click', async () => {
        const name = newPlaylistNameInput.value.trim();
        if (!name) {
            alert('플레이리스트 이름을 입력하세요.');
            return;
        }

        try {
            const response = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                newPlaylistNameInput.value = '';
                const playlists = await fetchAndRenderPlaylists();
                // 새 플레이리스트 생성 후, 자동으로 첫번째 플레이리스트 선택
                if (playlists.length === 1) {
                    await selectPlaylist(playlists[0].id);
                }
            } else {
                alert('플레이리스트 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('플레이리스트 생성 오류:', error);
        }
    });

    /** 플레이리스트 목록에서 특정 항목 클릭 이벤트 */
    /** 플레이리스트 목록에서 발생하는 모든 클릭 이벤트 처리 */
    playlistListEl.addEventListener('click', async (event) => {
        const target = event.target;

        // 플레이리스트 이름 클릭 시 (a 태그)
        if (target.tagName === 'A') {
            event.preventDefault();
            await selectPlaylist(target.dataset.id);
        }

        // 플레이리스트 삭제 버튼 클릭 시
        if (target.matches('.btn-delete-playlist')) {
            const playlistId = target.dataset.id;
            const playlistName = target.closest('li').querySelector('a').textContent;
            if (confirm(`'${playlistName}' 플레이리스트를 정말로 삭제하시겠습니까?`)) {
                try {
                    await fetch(`/api/playlists/${playlistId}`, { method: 'DELETE' });
                    // 삭제 후 목록 새로고침 및 첫번째 항목 선택
                    const playlists = await fetchAndRenderPlaylists();
                    if (playlists.length > 0) {
                        await selectPlaylist(playlists[0].id);
                    } else {
                        // 모든 플레이리스트가 삭제된 경우
                        selectedPlaylistTitleEl.textContent = '플레이리스트를 생성해 주세요';
                        songListInPlaylistEl.innerHTML = '<li>왼쪽에서 새 플레이리스트를 먼저 생성해주세요.</li>';
                    }
                } catch (error) {
                    console.error('플레이리스트 삭제 오류:', error);
                }
            }
        }

        // 플레이리스트 이름 수정 버튼 클릭 시
        if (target.matches('.btn-edit-playlist')) {
            const playlistId = target.dataset.id;
            const linkElement = target.closest('li').querySelector('a');
            const currentName = linkElement.textContent;
            
            const newName = prompt('새 플레이리스트 이름을 입력하세요:', currentName);

            if (newName && newName.trim() !== '' && newName !== currentName) {
                try {
                    await fetch(`/api/playlists/${playlistId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName.trim() })
                    });
                    await fetchAndRenderPlaylists(); // 이름 수정 후 목록 새로고침
                } catch (error) {
                    console.error('플레이리스트 이름 수정 오류:', error);
                }
            }
        }
    });

    /** 수록곡 목록에서 삭제 버튼 클릭 이벤트 */
    songListInPlaylistEl.addEventListener('click', async (event) => {
        if (event.target.matches('.btn-delete')) {
            const songId = event.target.dataset.songId;
            if (!activePlaylistId) return;

            if (confirm('정말로 이 노래를 플레이리스트에서 삭제하시겠습니까?')) {
                try {
                    const response = await fetch(`/api/playlists/${activePlaylistId}/songs/${songId}`, {
                        method: 'DELETE'
                    });
                    if (response.ok) {
                        await selectPlaylist(activePlaylistId); // 목록 새로고침
                    } else {
                        alert('삭제에 실패했습니다.');
                    }
                } catch (error) {
                    console.error('수록곡 삭제 오류:', error);
                }
            }
        }
    });

    // 노래 추가 관련 이벤트 리스너들
    addSongToPlaylistBtn.addEventListener('click', openAddSongModal);
    
    // 모달 닫기 버튼
    addSongModal.querySelector('.close-btn').addEventListener('click', closeAddSongModal);
    
    // 모달 배경 클릭 시 닫기
    addSongModal.addEventListener('click', (e) => {
        if (e.target === addSongModal) {
            closeAddSongModal();
        }
    });
    
    // 노래 검색 버튼
    searchSongsBtn.addEventListener('click', () => {
        const searchTerm = songSearchInput.value.trim();
        const filteredSongs = searchSongs(searchTerm);
        renderAvailableSongs(filteredSongs);
    });
    
    // 엔터키로 검색
    songSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = songSearchInput.value.trim();
            const filteredSongs = searchSongs(searchTerm);
            renderAvailableSongs(filteredSongs);
        }
    });
    
    // 노래 추가 버튼 클릭 이벤트 (이벤트 위임)
    availableSongsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('add-to-playlist-btn')) {
            const songId = e.target.dataset.songId;
            const success = await addSongToPlaylist(songId, activePlaylistId);
            
            if (success) {
                // 성공 시 현재 플레이리스트 새로고침
                await selectPlaylist(activePlaylistId);
                // 모달의 노래 목록도 새로고침
                const currentPlaylistSongs = await getSongsInPlaylist(activePlaylistId);
                const searchTerm = songSearchInput.value.trim();
                const filteredSongs = searchSongs(searchTerm);
                renderAvailableSongs(filteredSongs, currentPlaylistSongs);
            }
        }
    });

    // --- 3. 노래 추가 관련 함수들 ---
    
    /** 현재 플레이리스트의 노래들을 가져오는 함수 */
    async function getSongsInPlaylist(playlistId) {
        try {
            const response = await fetch(`/api/playlists/${playlistId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const playlist = await response.json();
                return playlist.Songs || [];
            } else {
                console.error('플레이리스트 노래 목록을 가져오는데 실패했습니다.');
                return [];
            }
        } catch (error) {
            console.error('플레이리스트 노래 목록 조회 오류:', error);
            return [];
        }
    }
    
    /** 모든 노래 데이터를 가져오는 함수 */
    async function fetchAllSongs() {
        try {
            const response = await fetch('/api/songs/main', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                window.location.href = '/login.html';
                return [];
            }
            
            if (response.ok) {
                allSongs = await response.json();
                return allSongs;
            } else {
                console.error('노래 목록을 가져오는데 실패했습니다.');
                return [];
            }
        } catch (error) {
            console.error('노래 목록 조회 오류:', error);
            return [];
        }
    }
    
    /** 노래 검색 함수 */
    function searchSongs(searchTerm) {
        if (!searchTerm.trim()) {
            return allSongs;
        }
        
        const term = searchTerm.toLowerCase();
        return allSongs.filter(song => 
            song.title.toLowerCase().includes(term) ||
            (song.artist && song.artist.toLowerCase().includes(term)) ||
            (song.composer && song.composer.toLowerCase().includes(term))
        );
    }
    
    /** 검색된 노래들을 모달에 표시하는 함수 */
    function renderAvailableSongs(songs, currentPlaylistSongs = []) {
        availableSongsList.innerHTML = '';
        
        if (songs.length === 0) {
            availableSongsList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">검색 결과가 없습니다.</li>';
            return;
        }
        
        songs.forEach(song => {
            const isAlreadyAdded = currentPlaylistSongs.some(playlistSong => playlistSong.id === song.id);
            
            const listItem = document.createElement('li');
            listItem.className = 'song-item';
            listItem.innerHTML = `
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-details">
                        ${song.artist || '알 수 없음'} • ${song.genre || '알 수 없음'} • ${song.date || '알 수 없음'}
                    </div>
                </div>
                <div>
                    ${isAlreadyAdded 
                        ? '<span class="already-added">이미 추가됨</span>' 
                        : `<button class="add-to-playlist-btn" data-song-id="${song.id}">추가</button>`
                    }
                </div>
            `;
            
            availableSongsList.appendChild(listItem);
        });
    }
    
    /** 노래를 플레이리스트에 추가하는 함수 */
    async function addSongToPlaylist(songId, playlistId) {
        try {
            const response = await fetch(`/api/playlists/${playlistId}/songs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songId: songId }),
                credentials: 'include'
            });
            
            if (response.status === 401) {
                alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                window.location.href = '/login.html';
                return false;
            }
            
            if (response.ok) {
                const result = await response.json();
                alert(result.message || '플레이리스트에 노래를 추가했습니다.');
                return true;
            } else {
                const error = await response.json();
                if (response.status === 409 && error.isDuplicate) {
                    alert(`⚠️ ${error.message}`);
                } else {
                    alert(error.message || '노래 추가에 실패했습니다.');
                }
                return false;
            }
        } catch (error) {
            console.error('플레이리스트에 노래 추가 오류:', error);
            alert('노래 추가 중 오류가 발생했습니다.');
            return false;
        }
    }
    
    /** 모달을 여는 함수 */
    async function openAddSongModal() {
        if (!activePlaylistId) {
            alert('먼저 플레이리스트를 선택해주세요.');
            return;
        }
        
        // 모든 노래 데이터 로드
        await fetchAllSongs();
        
        // 현재 플레이리스트의 노래들 가져오기
        const currentPlaylistSongs = await getSongsInPlaylist(activePlaylistId);
        
        // 모든 노래 표시
        renderAvailableSongs(allSongs, currentPlaylistSongs);
        
        // 모달 표시
        addSongModal.classList.add('visible');
        songSearchInput.focus();
    }
    
    /** 모달을 닫는 함수 */
    function closeAddSongModal() {
        addSongModal.classList.remove('visible');
        songSearchInput.value = '';
        availableSongsList.innerHTML = '';
    }

    // --- 4. 초기 실행 ---
    async function init() {
        const playlists = await fetchAndRenderPlaylists();

        if (playlists && playlists.length > 0) {
            // 플레이리스트가 있으면 첫 번째 항목을 자동으로 선택
            await selectPlaylist(playlists[0].id);
        } else {
            // 플레이리스트가 없으면 안내 메시지 표시
            selectedPlaylistNameEl.textContent = '플레이리스트를 선택하세요';
            addSongToPlaylistBtn.style.display = 'none';
            songListInPlaylistEl.innerHTML = '<li>왼쪽에서 새 플레이리스트를 먼저 생성해주세요.</li>';
        }
    }

    init(); // 페이지 로딩 시 메인 함수 실행
});