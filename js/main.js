import { fetchAllSongs } from './api.js';
import { renderSongTable } from './ui.js';

// --- 전역 변수 ---
const songTableBody = document.getElementById('song-table-body');
const player = document.getElementById('music-player');
const tableHeader = document.querySelector('.song-table thead');
const searchInput = document.getElementById('search-input');
const lyricsModal = document.getElementById('lyrics-modal');
const playlistModal = document.getElementById('playlist-modal');
const modalPlaylistList = document.getElementById('modal-playlist-list');

let allSongs = [];
let currentSort = { column: 'title', ascending: true };
let songIdToAdd = null;

// --- 핵심 렌더링/뷰 업데이트 함수 ---
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

// --- 이벤트 리스너 설정 ---
function setupEventListeners() {
    // 노래 테이블 클릭 이벤트 (재생, 가사, 추가)
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

    // 플레이리스트 선택 팝업에서 플레이리스트 클릭 시
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

    // 모달 닫기 이벤트
    lyricsModal.addEventListener('click', (e) => { if (e.target.matches('.close-btn') || e.target === lyricsModal) lyricsModal.classList.remove('visible'); });
    playlistModal.addEventListener('click', (e) => { if (e.target.matches('.close-btn') || e.target === playlistModal) playlistModal.classList.remove('visible'); });
    
    // 테이블 헤더 클릭 (정렬) 이벤트
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

    // 검색창 입력 이벤트
    searchInput.addEventListener('input', () => {
        updateView();
    });
}

// --- 초기 실행 ---
async function init() {
    allSongs = await fetchAllSongs();
    setupEventListeners();
    updateView();
}

init();