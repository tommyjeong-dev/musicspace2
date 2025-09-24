// js/main.js

import { fetchAllSongs } from './api.js';
import { renderSongTable } from './ui.js';

// --- 전역 변수 ---
const songTableBody = document.getElementById('song-table-body');
const player = document.getElementById('music-player');
const modal = document.getElementById('lyrics-modal');
const tableHeader = document.querySelector('.song-table thead');

let allSongs = [];
let currentSort = {
    column: 'title',
    ascending: true
};

// --- 핵심 함수 ---
function sortAndRenderSongs() {
    allSongs.sort((a, b) => {
        let valA = a[currentSort.column] || '';
        let valB = b[currentSort.column] || '';
        if (valA < valB) return currentSort.ascending ? -1 : 1;
        if (valA > valB) return currentSort.ascending ? 1 : -1;
        return 0;
    });
    renderSongTable(allSongs, songTableBody);
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
    songTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.matches('.btn-play')) {
            const src = target.dataset.src;
            const playingRow = document.querySelector('tr.playing');

            if(playingRow) playingRow.classList.remove('playing');
            
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
                modal.classList.add('visible');
            } catch (error) {
                console.error("가사 로딩 중 오류:", error);
            }
        }
    });

    modal.addEventListener('click', (event) => {
        if (event.target.matches('.close-btn') || event.target === modal) {
            modal.classList.remove('visible');
        }
    });

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
        sortAndRenderSongs();
    });
}

// --- 초기 실행 ---
async function init() {
    allSongs = await fetchAllSongs();
    setupEventListeners();
    sortAndRenderSongs();
}

init();