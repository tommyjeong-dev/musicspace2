import { fetchAllSongs } from './api.js';
import { renderSongTable } from './ui.js';

const songTableBody = document.getElementById('song-table-body');
const player = document.getElementById('music-player');
const tableHeader = document.querySelector('.song-table thead');
const searchInput = document.getElementById('search-input');
const lyricsModal = document.getElementById('lyrics-modal');
const playlistModal = document.getElementById('playlist-modal');
const modalPlaylistList = document.getElementById('modal-playlist-list');
const userInfo = document.getElementById('user-info');
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout-btn');
const loginLink = document.getElementById('login-link');
let allSongs = [];
let currentSort = { column: 'title', ascending: true };
let songIdToAdd = null;

function updateView() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredSongs = allSongs.filter(song => 
        song.title.toLowerCase().includes(searchTerm) ||
        (song.artist && song.artist.toLowerCase().includes(searchTerm)) ||
        (song.composer && song.composer.toLowerCase().includes(searchTerm)) ||
        (song.genre && song.genre.toLowerCase().includes(searchTerm))
    );
    filteredSongs.sort((a, b) => {
        let valA = a[currentSort.column] || '';
        let valB = b[currentSort.column] || '';
        if (valA < valB) return currentSort.ascending ? -1 : 1;
        if (valA > valB) return currentSort.ascending ? 1 : -1;
        return 0;
    });
    renderSongTable(filteredSongs, songTableBody);
    updateTableHeaderSortUI();
}

function updateTableHeaderSortUI() {
    document.querySelectorAll('.song-table th[data-sort]').forEach(th => {
        if (th.dataset.sort === currentSort.column) {
            th.classList.add('active');
            th.dataset.direction = currentSort.ascending ? 'asc' : 'desc';
        } else {
            th.classList.remove('active');
            th.removeAttribute('data-direction');
        }
    });
}

function setupEventListeners() {
    songTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.matches('.btn-play')) {
            const src = target.dataset.src;
            const playingRow = document.querySelector('tr.playing');
            if (playingRow) playingRow.classList.remove('playing');
            target.closest('tr').classList.add('playing');
            player.src = src;
            player.play();
        }
        if (target.matches('.btn-lyrics')) {
            const songId = target.dataset.songId;
            try {
                const response = await fetch(`/api/songs/${songId}`);
                const song = await response.json();
                document.getElementById('modal-song-title').textContent = song.title;
                document.getElementById('modal-lyrics-content').textContent = song.lyrics || "가사 정보가 없습니다.";
                lyricsModal.classList.add('visible');
            } catch (error) {
                console.error("가사 로딩 중 오류:", error);
            }
        }
        if (target.matches('.btn-add-to-playlist')) {
            songIdToAdd = target.dataset.songId;
            try {
                const response = await fetch('/api/playlists');
                const playlists = await response.json();
                modalPlaylistList.innerHTML = '';
                playlists.forEach(playlist => {
                    const li = document.createElement('li');
                    li.textContent = playlist.name;
                    li.dataset.playlistId = playlist.id;
                    modalPlaylistList.appendChild(li);
                });
                playlistModal.classList.add('visible');
            } catch (error) {
                console.error('플레이리스트 목록 로딩 오류:', error);
            }
        }
    });

    modalPlaylistList.addEventListener('click', async (event) => {
        if (event.target.tagName === 'LI') {
            const playlistId = event.target.dataset.playlistId;
            try {
                const response = await fetch(`/api/playlists/${playlistId}/songs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ songId: songIdToAdd })
                });
                if (response.ok) {
                    alert('플레이리스트에 노래를 추가했습니다.');
                } else {
                    alert('노래 추가에 실패했습니다.');
                }
            } catch (error) {
                console.error('플레이리스트에 노래 추가 오류:', error);
            } finally {
                playlistModal.classList.remove('visible');
            }
        }
    });

    lyricsModal.addEventListener('click', (e) => { if (e.target.matches('.close-btn') || e.target === lyricsModal) lyricsModal.classList.remove('visible'); });
    playlistModal.addEventListener('click', (e) => { if (e.target.matches('.close-btn') || e.target === playlistModal) playlistModal.classList.remove('visible'); });
    
    tableHeader.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName !== 'TH' || !target.dataset.sort) return;
        const sortColumn = target.dataset.sort;
        if (currentSort.column === sortColumn) {
            currentSort.ascending = !currentSort.ascending;
        } else {
            currentSort.column = sortColumn;
            currentSort.ascending = true;
        }
        updateView();
    });
    searchInput.addEventListener('input', () => {
        updateView();
    });
}

// 사용자 인증 상태 확인
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            usernameSpan.textContent = data.user.username;
            userInfo.style.display = 'block';
            logoutBtn.style.display = 'inline-block';
            loginLink.style.display = 'none';
        } else {
            userInfo.style.display = 'none';
            logoutBtn.style.display = 'none';
            loginLink.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('인증 상태 확인 오류:', error);
        userInfo.style.display = 'none';
        logoutBtn.style.display = 'none';
        loginLink.style.display = 'inline-block';
    }
}

// 로그아웃 기능
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            userInfo.style.display = 'none';
            logoutBtn.style.display = 'none';
            loginLink.style.display = 'inline-block';
            alert('로그아웃되었습니다.');
        } else {
            alert('로그아웃에 실패했습니다.');
        }
    } catch (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
}

function setupEventListeners() {
    // 기존 이벤트 리스너들...
    songTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.matches('.btn-play')) {
            const src = target.dataset.src;
            const playingRow = document.querySelector('tr.playing');
            if (playingRow) playingRow.classList.remove('playing');
            target.closest('tr').classList.add('playing');
            player.src = src;
            player.play();
        }
        if (target.matches('.btn-lyrics')) {
            const songId = target.dataset.songId;
            try {
                const response = await fetch(`/api/songs/${songId}`);
                const song = await response.json();
                document.getElementById('modal-song-title').textContent = song.title;
                document.getElementById('modal-lyrics-content').textContent = song.lyrics || "가사 정보가 없습니다.";
                lyricsModal.classList.add('visible');
            } catch (error) {
                console.error("가사 로딩 중 오류:", error);
            }
        }
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
                modalPlaylistList.innerHTML = '';
                playlists.forEach(playlist => {
                    const li = document.createElement('li');
                    li.textContent = playlist.name;
                    li.dataset.playlistId = playlist.id;
                    modalPlaylistList.appendChild(li);
                });
                playlistModal.classList.add('visible');
            } catch (error) {
                console.error('플레이리스트 목록 로딩 오류:', error);
                alert('플레이리스트를 불러오는 중 오류가 발생했습니다.');
            }
        }
    });

    modalPlaylistList.addEventListener('click', async (event) => {
        if (event.target.tagName === 'LI') {
            const playlistId = event.target.dataset.playlistId;
            try {
                const response = await fetch(`/api/playlists/${playlistId}/songs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ songId: songIdToAdd }),
                    credentials: 'include'
                });
                if (response.ok) {
                    alert('플레이리스트에 노래를 추가했습니다.');
                } else {
                    alert('노래 추가에 실패했습니다.');
                }
            } catch (error) {
                console.error('플레이리스트에 노래 추가 오류:', error);
            } finally {
                playlistModal.classList.remove('visible');
            }
        }
    });

    lyricsModal.addEventListener('click', (e) => { if (e.target.matches('.close-btn') || e.target === lyricsModal) lyricsModal.classList.remove('visible'); });
    playlistModal.addEventListener('click', (e) => { if (e.target.matches('.close-btn') || e.target === playlistModal) playlistModal.classList.remove('visible'); });
    
    tableHeader.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName !== 'TH' || !target.dataset.sort) return;
        const sortColumn = target.dataset.sort;
        if (currentSort.column === sortColumn) {
            currentSort.ascending = !currentSort.ascending;
        } else {
            currentSort.column = sortColumn;
            currentSort.ascending = true;
        }
        updateView();
    });
    searchInput.addEventListener('input', () => {
        updateView();
    });
    
    // 로그아웃 버튼 이벤트
    logoutBtn.addEventListener('click', logout);
}

async function init() {
    await checkAuthStatus();
    allSongs = await fetchAllSongs();
    setupEventListeners();
    updateView();
}
init();