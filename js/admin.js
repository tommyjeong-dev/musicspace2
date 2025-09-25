// js/admin.js

// --- 1. 전역 변수 ---
const songListElement = document.getElementById('song-management-list');
const addSongForm = document.getElementById('add-song-form');

// --- 2. 핵심 함수 ---

/** 서버에서 모든 노래 목록을 가져와 렌더링하는 함수 */
async function fetchAndRenderSongs() {
    try {
        const response = await fetch('/api/songs');
        if (!response.ok) throw new Error('서버 응답 오류');
        
        const songs = await response.json();
        
        songListElement.innerHTML = ''; // 목록 초기화

        songs.forEach(song => {
            const listItem = document.createElement('li');
            listItem.className = 'song-item';
            listItem.innerHTML = `
                <div class="song-info">
                    <span class="song-title">${song.title}</span>
                    <span class="song-artist">${song.artist}</span>
                </div>
                <div class="buttons">
                    <button class="btn-edit" data-id="${song.id}">수정</button>
                    <button class="btn-delete" data-id="${song.id}">삭제</button>
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
        // ... (기존과 동일) ...
    });

    // 노래 목록 내 클릭 이벤트 (수정 및 삭제 처리)
    songListElement.addEventListener('click', async (event) => {
        const target = event.target;

        // '수정' 버튼을 클릭했을 때
        if (target.matches('.btn-edit')) {
            const songId = target.dataset.id;
            // 수정 페이지로 이동
            window.location.href = `edit.html?id=${songId}`;
        }

        // '삭제' 버튼을 클릭했을 때
        if (target.matches('.btn-delete')) {
            // ... (기존과 동일) ...
        }
    });
}

// --- 4. 초기 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSongs();
    setupEventListeners();
});