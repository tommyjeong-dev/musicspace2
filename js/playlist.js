document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 전역 변수 ---
    const playlistListEl = document.getElementById('playlist-list');
    const newPlaylistNameInput = document.getElementById('new-playlist-name');
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const songListInPlaylistEl = document.getElementById('song-list-in-playlist');

    let activePlaylistId = null;

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

    // --- 4. 초기 실행 ---
    async function init() {
        const playlists = await fetchAndRenderPlaylists();

        if (playlists && playlists.length > 0) {
            // 플레이리스트가 있으면 첫 번째 항목을 자동으로 선택
            await selectPlaylist(playlists[0].id);
        } else {
            // 플레이리스트가 없으면 안내 메시지 표시
            songListInPlaylistEl.innerHTML = '<li>왼쪽에서 새 플레이리스트를 먼저 생성해주세요.</li>';
        }
    }

    init(); // 페이지 로딩 시 메인 함수 실행
});