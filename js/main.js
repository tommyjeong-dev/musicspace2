// 새로운 메인페이지 JavaScript
import { fetchAllSongs } from './api.js';

// 전역 변수
let allSongs = [];
let currentSort = { column: 'title', ascending: true };
let songIdToAdd = null;

// DOM 요소들
const searchBtn = document.getElementById('search-btn');
const mySongsBtn = document.getElementById('my-songs-btn');
const myPlaylistsBtn = document.getElementById('my-playlists-btn');
const searchSection = document.getElementById('search-section');
const mySongsSection = document.getElementById('my-songs-section');
const myPlaylistsSection = document.getElementById('my-playlists-section');
const searchInput = document.getElementById('search-input');
const genreSelect = document.getElementById('genre-select');
const customGenreInput = document.getElementById('custom-genre-input');
const searchSubmitBtn = document.getElementById('search-submit-btn');
const searchResults = document.getElementById('search-results');
const searchResultsBody = document.getElementById('search-results-body');
const resultsCount = document.getElementById('results-count');
const mySongsBody = document.getElementById('my-songs-body');
const playlistsList = document.getElementById('playlists-list');
const addSongBtn = document.getElementById('add-song-btn');
const managePlaylistsBtn = document.getElementById('manage-playlists-btn');
const player = document.getElementById('music-player');
const lyricsModal = document.getElementById('lyrics-modal');
const playlistModal = document.getElementById('playlist-modal');
const modalPlaylistList = document.getElementById('modal-playlist-list');
const newPlaylistNameInput = document.getElementById('new-playlist-name-input');
const createAndAddBtn = document.getElementById('create-and-add-btn');
const userInfo = document.getElementById('user-info');
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout-btn');
const loginLink = document.getElementById('login-link');
const bottomAdminLink = document.getElementById('bottom-admin-link');
const volumeSlider = document.getElementById('volume-slider');
const volumeDisplay = document.getElementById('volume-display');

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('새로운 메인페이지 초기화 시작');
    
    // 사용자 인증 상태 확인
    await checkAuthStatus();
    
    // 모든 노래 데이터 로드
    await loadAllSongs();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 볼륨 컨트롤 초기화
    initializeVolumeControl();
    
    console.log('새로운 메인페이지 초기화 완료');
});

// 모든 노래 데이터 로드
async function loadAllSongs() {
    try {
        allSongs = await fetchAllSongs();
        console.log('로드된 노래 수:', allSongs.length);
        
        // 장르 목록 동적 생성
        await loadGenres();
    } catch (error) {
        console.error('노래 데이터 로드 실패:', error);
        allSongs = [];
    }
}

// 장르 목록 동적 로드
async function loadGenres() {
    try {
        // 모든 노래에서 고유한 장르 추출
        const uniqueGenres = [...new Set(allSongs.map(song => song.genre).filter(genre => genre))].sort();
        
        // 기존 옵션들 제거 (첫 번째 "모든 장르" 옵션 제외)
        const genreSelect = document.getElementById('genre-select');
        if (genreSelect) {
            // 기존 옵션들 제거 (첫 번째 "모든 장르" 옵션 제외)
            while (genreSelect.children.length > 1) {
                genreSelect.removeChild(genreSelect.lastChild);
            }
            
            // 새로운 장르 옵션들 추가
            uniqueGenres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreSelect.appendChild(option);
            });
            
            console.log('로드된 장르 목록:', uniqueGenres);
        }
    } catch (error) {
        console.error('장르 목록 로드 실패:', error);
    }
}

// 사용자 인증 상태 확인
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('로그인 상태:', data.user.username, '관리자:', data.user.isAdmin);
            
            // 로그인된 상태
            if (userInfo) userInfo.style.display = 'block';
            if (usernameSpan) usernameSpan.textContent = data.user.username;
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (loginLink) loginLink.style.display = 'none';
            
            // 하단 관리자 링크 처리
            if (bottomAdminLink) {
                bottomAdminLink.style.display = 'inline-block';
                if (data.user.isAdmin) {
                    bottomAdminLink.textContent = '관리자 페이지로 이동';
                } else {
                    bottomAdminLink.textContent = '나의 노래 관리하기';
                }
            }
            
            // 플레이리스트 목록 로드
            await loadPlaylists();
            
        } else {
            // 로그인되지 않은 상태
            if (userInfo) userInfo.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (loginLink) loginLink.style.display = 'inline-block';
            if (bottomAdminLink) bottomAdminLink.style.display = 'none';
        }
    } catch (error) {
        console.error('인증 상태 확인 오류:', error);
        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginLink) loginLink.style.display = 'inline-block';
        if (bottomAdminLink) bottomAdminLink.style.display = 'none';
    }
}

// 플레이리스트 목록 로드
async function loadPlaylists() {
    try {
        const response = await fetch('/api/playlists', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            console.log('로그인이 필요합니다');
            return;
        }
        
        const playlists = await response.json();
        renderPlaylists(playlists);
    } catch (error) {
        console.error('플레이리스트 로드 오류:', error);
    }
}

// 플레이리스트 렌더링
function renderPlaylists(playlists) {
    if (!playlistsList) return;
    
    console.log('플레이리스트 데이터:', playlists);
    
    playlistsList.innerHTML = '';
    
    if (playlists.length === 0) {
        playlistsList.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">플레이리스트가 없습니다.</p>';
        return;
    }
    
    playlists.forEach(playlist => {
        console.log(`플레이리스트 "${playlist.name}":`, playlist);
        const songCount = playlist.Songs ? playlist.Songs.length : 0;
        console.log(`노래 수: ${songCount}`);
        
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `
            <h4>${playlist.name}</h4>
            <p>노래 ${songCount}곡</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = `playlist.html?id=${playlist.id}`;
        });
        playlistsList.appendChild(card);
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 메뉴 버튼 클릭 이벤트
    searchBtn.addEventListener('click', () => switchSection('search'));
    mySongsBtn.addEventListener('click', () => switchSection('my-songs'));
    myPlaylistsBtn.addEventListener('click', () => switchSection('my-playlists'));
    
    // 검색 관련 이벤트
    searchSubmitBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    genreSelect.addEventListener('change', handleGenreChange);
    customGenreInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // 버튼 클릭 이벤트
    addSongBtn.addEventListener('click', () => {
        window.location.href = 'admin.html?openForm=true';
    });
    
    managePlaylistsBtn.addEventListener('click', () => {
        window.location.href = 'playlist.html';
    });
    
    // 로그아웃 버튼
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 모달 닫기 이벤트
    lyricsModal.addEventListener('click', (e) => {
        if (e.target.matches('.close-btn') || e.target === lyricsModal) {
            lyricsModal.classList.remove('visible');
        }
    });
    
    playlistModal.addEventListener('click', (e) => {
        if (e.target.matches('.close-btn') || e.target === playlistModal) {
            playlistModal.classList.remove('visible');
        }
    });
    
    // 새로운 플레이리스트 생성 버튼
    createAndAddBtn.addEventListener('click', async () => {
        const playlistName = newPlaylistNameInput.value.trim();
        
        if (!playlistName) {
            alert('플레이리스트 이름을 입력해주세요.');
            newPlaylistNameInput.focus();
            return;
        }
        
        if (!songIdToAdd) {
            alert('추가할 노래를 찾을 수 없습니다.');
            return;
        }
        
        // 버튼 비활성화
        createAndAddBtn.disabled = true;
        createAndAddBtn.textContent = '생성 중...';
        
        try {
            const success = await createPlaylistAndAddSong(playlistName, songIdToAdd);
            
            if (success) {
                // 성공 시 모달 닫기 및 입력 필드 초기화
                playlistModal.classList.remove('visible');
                newPlaylistNameInput.value = '';
                songIdToAdd = null;
                
                // 플레이리스트 목록 새로고침 (선택사항)
                // loadPlaylists();
            }
        } finally {
            // 버튼 상태 복원
            createAndAddBtn.disabled = false;
            createAndAddBtn.textContent = '생성 후 추가';
        }
    });
    
    // 엔터키로 새 플레이리스트 생성
    newPlaylistNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createAndAddBtn.click();
        }
    });
}

// 섹션 전환
function switchSection(sectionName) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 모든 메뉴 버튼 비활성화
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택된 섹션 표시
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // 선택된 메뉴 버튼 활성화
    const targetBtn = document.getElementById(`${sectionName}-btn`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    // 섹션별 데이터 로드
    if (sectionName === 'my-songs') {
        loadMySongs();
    } else if (sectionName === 'my-playlists') {
        loadPlaylists();
    }
}

// 장르 선택 변경 핸들러
function handleGenreChange() {
    const selectedGenre = genreSelect.value;
    
    if (selectedGenre === 'custom') {
        customGenreInput.style.display = 'block';
        customGenreInput.focus();
    } else {
        customGenreInput.style.display = 'none';
        customGenreInput.value = '';
    }
    
    performSearch();
}

// 검색 수행
function performSearch() {
    const searchTerm = searchInput.value.trim();
    const selectedGenre = genreSelect.value;
    const customGenre = customGenreInput.value.trim();
    
    // 실제 사용할 장르 값 결정
    let actualGenre = '';
    if (selectedGenre === 'custom' && customGenre) {
        actualGenre = customGenre;
    } else if (selectedGenre && selectedGenre !== 'custom') {
        actualGenre = selectedGenre;
    }
    
    // 와일드카드 검색 (*) 처리
    const isWildcardSearch = searchTerm === '*';
    
    // 검색어와 장르가 모두 비어있으면 결과 숨김 (와일드카드 제외)
    if (!searchTerm && !actualGenre) {
        searchResults.style.display = 'none';
        return;
    }
    
    // allSongs에는 이미 로그인한 사용자의 경우 공개 노래 + 본인 비공개 노래가 포함됨
    // 로그인하지 않은 사용자의 경우 공개 노래만 포함됨
    let filteredSongs = allSongs;
    
    // 텍스트 검색 (제목, 아티스트, 작곡가) - 와일드카드가 아닌 경우에만
    if (searchTerm && !isWildcardSearch) {
        const searchTermLower = searchTerm.toLowerCase();
        filteredSongs = filteredSongs.filter(song => 
            song.title.toLowerCase().includes(searchTermLower) ||
            (song.artist && song.artist.toLowerCase().includes(searchTermLower)) ||
            (song.composer && song.composer.toLowerCase().includes(searchTermLower))
        );
    }
    
    // 장르 필터링
    if (actualGenre) {
        filteredSongs = filteredSongs.filter(song => 
            song.genre && song.genre.toLowerCase().includes(actualGenre.toLowerCase())
        );
    }
    
    renderSearchResults(filteredSongs);
}

// 검색 결과 렌더링
function renderSearchResults(songs) {
    if (songs.length === 0) {
        searchResultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999;">검색 결과가 없습니다.</td></tr>';
    } else {
        searchResultsBody.innerHTML = '';
        songs.forEach(song => {
            const row = searchResultsBody.insertRow();
            row.innerHTML = `
                <td class="song-title" data-src="${song.src}">${song.title}</td>
                <td>${song.artist || '-'}</td>
                <td>${song.genre || '-'}</td>
                <td>${song.date || '-'}</td>
                <td><span class="privacy-badge ${song.isPublic ? 'public' : 'private'}">${song.isPublic ? '공개' : '비공개'}</span></td>
                <td><button class="btn btn-play" data-src="${song.src}">재생</button></td>
                <td><button class="btn btn-add-to-playlist" data-song-id="${song.id}">PL에 추가</button></td>
                <td><button class="btn btn-lyrics" data-song-id="${song.id}">가사</button></td>
            `;
        });
    }
    
    // 검색 조건 표시
    const searchTerm = searchInput.value.trim();
    const selectedGenre = genreSelect.value;
    const customGenre = customGenreInput.value.trim();
    
    let actualGenre = '';
    if (selectedGenre === 'custom' && customGenre) {
        actualGenre = customGenre;
    } else if (selectedGenre && selectedGenre !== 'custom') {
        actualGenre = selectedGenre;
    }
    
    let searchCondition = '';
    if (searchTerm === '*') {
        // 와일드카드 검색
        if (actualGenre) {
            searchCondition = `모든 노래 + ${actualGenre} 장르`;
        } else {
            searchCondition = '모든 노래';
        }
    } else if (searchTerm && actualGenre) {
        searchCondition = `"${searchTerm}" + ${actualGenre} 장르`;
    } else if (searchTerm) {
        searchCondition = `"${searchTerm}"`;
    } else if (actualGenre) {
        searchCondition = `${actualGenre} 장르`;
    }
    
    resultsCount.textContent = `${songs.length}곡 ${searchCondition ? `(${searchCondition})` : ''}`;
    searchResults.style.display = 'block';
}

// 나의 노래 로드
async function loadMySongs() {
    try {
        const response = await fetch('/api/songs/my', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            mySongsBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">로그인이 필요합니다.</td></tr>';
            return;
        }
        
        const songs = await response.json();
        renderMySongs(songs);
    } catch (error) {
        console.error('나의 노래 로드 오류:', error);
        mySongsBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">노래를 불러오는 중 오류가 발생했습니다.</td></tr>';
    }
}

// 나의 노래 렌더링
function renderMySongs(songs) {
    if (songs.length === 0) {
        mySongsBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">업로드한 노래가 없습니다.</td></tr>';
        return;
    }
    
    mySongsBody.innerHTML = '';
    songs.forEach(song => {
        const row = mySongsBody.insertRow();
        row.innerHTML = `
            <td class="song-title" data-src="${song.src}">${song.title}</td>
            <td>${song.artist || '-'}</td>
            <td>${song.genre || '-'}</td>
            <td><span class="privacy-badge ${song.isPublic ? 'public' : 'private'}">${song.isPublic ? '공개' : '비공개'}</span></td>
            <td><button class="btn btn-play" data-src="${song.src}">재생</button></td>
            <td><button class="btn btn-edit" data-song-id="${song.id}">수정</button></td>
            <td><button class="btn btn-delete" data-song-id="${song.id}">삭제</button></td>
        `;
    });
}

// 테이블 클릭 이벤트 처리
document.addEventListener('click', async (event) => {
        const target = event.target;
    
        // 재생 버튼
        if (target.matches('.btn-play')) {
            const src = target.dataset.src;
            const songTitle = target.closest('tr').querySelector('.song-title').textContent;
            const playingRow = document.querySelector('tr.playing');
            if (playingRow) playingRow.classList.remove('playing');
            target.closest('tr').classList.add('playing');
            window.globalAudioPlayer.play(src, songTitle);
        }
    
    // 제목 클릭 (재생)
    if (target.matches('.song-title')) {
        const src = target.dataset.src;
        const songTitle = target.textContent;
        const playingRow = document.querySelector('tr.playing');
        if (playingRow) playingRow.classList.remove('playing');
        target.closest('tr').classList.add('playing');
        window.globalAudioPlayer.play(src, songTitle);
    }
    
    // 가사 버튼
        if (target.matches('.btn-lyrics')) {
            const songId = target.dataset.songId;
            try {
            const response = await fetch(`/api/songs/${songId}`, {
                credentials: 'include'
            });
                const song = await response.json();
                document.getElementById('modal-song-title').textContent = song.title;
                document.getElementById('modal-lyrics-content').textContent = song.lyrics || "가사 정보가 없습니다.";
                lyricsModal.classList.add('visible');
            } catch (error) {
                console.error("가사 로딩 중 오류:", error);
            }
        }
    
    // 플레이리스트에 추가 버튼
        if (target.matches('.btn-add-to-playlist')) {
            songIdToAdd = target.dataset.songId;
            try {
            const response = await fetch('/api/playlists', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                window.location.href = '/login.html';
                return;
            }
            
                const playlists = await response.json();
            
            if (playlists.length === 0) {
                alert('플레이리스트가 없습니다. 플레이리스트 페이지에서 먼저 플레이리스트를 만들어주세요.');
                window.location.href = 'playlist.html';
                return;
            }
            
                modalPlaylistList.innerHTML = '';
                playlists.forEach(playlist => {
                    const li = document.createElement('li');
                const isAlreadyAdded = playlist.Songs && playlist.Songs.some(song => song.id == songIdToAdd);
                
                if (isAlreadyAdded) {
                    li.innerHTML = `
                        <span class="playlist-name">${playlist.name}</span>
                        <span class="already-added">✓ 이미 추가됨</span>
                    `;
                    li.classList.add('already-added-item');
                    li.style.cursor = 'not-allowed';
                    li.style.opacity = '0.6';
                } else {
                    li.innerHTML = `<span class="playlist-name">${playlist.name}</span>`;
                }
                
                    li.dataset.playlistId = playlist.id;
                li.dataset.isAlreadyAdded = isAlreadyAdded;
                    modalPlaylistList.appendChild(li);
                });
                
                // 모달 열 때 입력 필드 초기화
                newPlaylistNameInput.value = '';
                newPlaylistNameInput.focus();
                
                playlistModal.classList.add('visible');
            } catch (error) {
                console.error('플레이리스트 목록 로딩 오류:', error);
            alert('플레이리스트를 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    // 수정 버튼
    if (target.matches('.btn-edit')) {
        const songId = target.dataset.songId;
        window.location.href = `edit.html?id=${songId}&admin=false`;
    }
    
    // 삭제 버튼
    if (target.matches('.btn-delete')) {
        const songId = target.dataset.songId;
        if (confirm('정말로 이 노래를 삭제하시겠습니까?')) {
            try {
                const response = await fetch(`/api/songs/${songId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    alert('노래가 삭제되었습니다.');
                    loadMySongs(); // 목록 새로고침
                } else {
                    alert('삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('노래 삭제 오류:', error);
                alert('삭제 중 오류가 발생했습니다.');
            }
            }
        }
    });

// 플레이리스트 모달에서 플레이리스트 선택
    modalPlaylistList.addEventListener('click', async (event) => {
    if (event.target.tagName === 'LI' || event.target.closest('LI')) {
        const li = event.target.tagName === 'LI' ? event.target : event.target.closest('LI');
        const playlistId = li.dataset.playlistId;
        const isAlreadyAdded = li.dataset.isAlreadyAdded === 'true';
        
        // 이미 추가된 플레이리스트는 클릭 방지
        if (isAlreadyAdded) {
            return;
        }
            try {
                const response = await fetch(`/api/playlists/${playlistId}/songs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songId: songIdToAdd }),
                credentials: 'include'
            });
            
            if (response.status === 401) {
                alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                window.location.href = '/login.html';
                return;
            }
            
                if (response.ok) {
                const result = await response.json();
                alert(result.message || '플레이리스트에 노래를 추가했습니다.');
            } else {
                const error = await response.json();
                if (response.status === 409 && error.isDuplicate) {
                    // 중복 추가 시도 - 경고 메시지 표시
                    alert(`⚠️ ${error.message}`);
                } else {
                    alert(error.message || '노래 추가에 실패했습니다.');
                }
                }
            } catch (error) {
                console.error('플레이리스트에 노래 추가 오류:', error);
            alert('플레이리스트 추가 중 오류가 발생했습니다.');
            } finally {
                playlistModal.classList.remove('visible');
            }
        }
    });

// 로그아웃 기능
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            // 음악 정지
            if (window.globalAudioPlayer) {
                window.globalAudioPlayer.stopOnLogout();
            }
            
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

// 새로운 플레이리스트 생성 및 노래 추가
async function createPlaylistAndAddSong(playlistName, songId) {
    try {
        // 1. 새 플레이리스트 생성
        const createResponse = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: playlistName }),
            credentials: 'include'
        });
        
        if (createResponse.status === 401) {
            alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
            window.location.href = '/login.html';
            return false;
        }
        
        if (!createResponse.ok) {
            const error = await createResponse.json();
            alert(error.message || '플레이리스트 생성에 실패했습니다.');
            return false;
        }
        
        const newPlaylist = await createResponse.json();
        console.log('새 플레이리스트 생성됨:', newPlaylist);
        
        // 2. 생성된 플레이리스트에 노래 추가
        const addResponse = await fetch(`/api/playlists/${newPlaylist.id}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId: songId }),
            credentials: 'include'
        });
        
        if (addResponse.ok) {
            const result = await addResponse.json();
            alert(`새 플레이리스트 "${playlistName}"을(를) 생성하고 노래를 추가했습니다!`);
            return true;
        } else {
            const error = await addResponse.json();
            if (addResponse.status === 409 && error.isDuplicate) {
                alert(`⚠️ ${error.message}`);
            } else {
                alert(error.message || '노래 추가에 실패했습니다.');
            }
            return false;
        }
    } catch (error) {
        console.error('플레이리스트 생성 및 노래 추가 오류:', error);
        alert('플레이리스트 생성 중 오류가 발생했습니다.');
        return false;
    }
}

// 볼륨 컨트롤 초기화
function initializeVolumeControl() {
    if (!volumeSlider || !volumeDisplay) return;
    
    // 전역 오디오 플레이어에서 볼륨 설정 불러오기
    const currentVolume = window.globalAudioPlayer.volume;
    volumeSlider.value = currentVolume * 100;
    volumeDisplay.textContent = Math.round(currentVolume * 100) + '%';
    updateVolumeIcon(currentVolume);
    
    // 볼륨 슬라이더 이벤트 리스너
    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        window.globalAudioPlayer.setVolume(volume);
        volumeDisplay.textContent = e.target.value + '%';
        updateVolumeIcon(volume);
    });
    
    // 키보드 단축키 (위/아래 화살표)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const currentVolume = parseFloat(volumeSlider.value);
            const newVolume = e.key === 'ArrowUp' 
                ? Math.min(100, currentVolume + 5)
                : Math.max(0, currentVolume - 5);
            
            volumeSlider.value = newVolume;
            const volume = newVolume / 100;
            window.globalAudioPlayer.setVolume(volume);
            volumeDisplay.textContent = newVolume + '%';
            updateVolumeIcon(volume);
        }
    });
}

// 볼륨 아이콘 업데이트
function updateVolumeIcon(volume) {
    const volumeIcon = document.querySelector('.volume-icon');
    if (!volumeIcon) return;
    
    if (volume === 0) {
        volumeIcon.textContent = '🔇';
    } else if (volume < 0.3) {
        volumeIcon.textContent = '🔈';
    } else if (volume < 0.7) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
}