// js/main.js

import { fetchAllSongs } from './api.js';
import { renderSongTable } from './ui.js';

// --- 전역 변수 ---
const songTableBody = document.getElementById('song-table-body');
const player = document.getElementById('music-player');
const modal = document.getElementById('lyrics-modal');
const tableHeader = document.querySelector('.song-table thead');

let allSongs = []; // 서버에서 받아온 모든 노래 원본
let currentSort = { // 현재 정렬 상태
    column: 'title',
    ascending: true
};

// --- 이벤트 리스너 설정 ---
function setupEventListeners() {
    // 테이블 내 '재생'/'가사' 버튼 클릭 이벤트
    songTableBody.addEventListener('click', async (event) => {
        // ... (기존과 동일) ...
    });

    // 가사 모달 닫기 이벤트
    modal.addEventListener('click', (event) => {
        // ... (기존과 동일) ...
    });

    // [새로 추가] 테이블 헤더 클릭 (정렬) 이벤트
    tableHeader.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName !== 'TH' || !target.dataset.sort) return;

        const sortColumn = target.dataset.sort;

        if (currentSort.column === sortColumn) {
            currentSort.ascending = !currentSort.ascending; // 정렬 방향 뒤집기
        } else {
            currentSort.column = sortColumn;
            currentSort.ascending = true; // 기본은 오름차순
        }

        sortAndRenderSongs();
    });
}

// [새로 추가] 노래를 정렬하고 화면을 다시 그리는 함수
function sortAndRenderSongs() {
    allSongs.sort((a, b) => {
        let valA = a[currentSort.column] || '';
        let valB = b[currentSort.column] || '';

        // 숫자가 아닌 문자열 비교
        if (valA < valB) return currentSort.ascending ? -1 : 1;
        if (valA > valB) return currentSort.ascending ? 1 : -1;
        return 0;
    });

    renderSongTable(allSongs, songTableBody);
    updateTableHeaderSortUI();
}

// [새로 추가] 정렬된 테이블 헤더에 시각적 효과를 주는 함수
function updateTableHeaderSortUI() {
    document.querySelectorAll('.song-table th').forEach(th => {
        if (th.dataset.sort === currentSort.column) {
            th.classList.add('active');
            th.dataset.direction = currentSort.ascending ? 'asc' : 'desc';
        } else {
            th.classList.remove('active');
            th.removeAttribute('data-direction');
        }
    });
}


// --- 초기 실행 ---
async function init() {
    allSongs = await fetchAllSongs(); // 노래 데이터를 전역 변수에 저장
    setupEventListeners();
    sortAndRenderSongs(); // 처음 로딩 시 기본 정렬(제목순)로 표시
}

init();