// js/admin.js

// --- 1. 전역 변수 ---
const songListElement = document.getElementById('song-management-list');
const addSongForm = document.getElementById('add-song-form');

// --- 2. 핵심 함수 ---
async function fetchAndRenderSongs() {
    // ... (기존과 동일) ...
}

// --- 3. 이벤트 처리 ---
function setupEventListeners() {
    // 폼 제출 이벤트
    addSongForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // 폼의 기본 제출 동작을 막음

        const formData = new FormData(addSongForm);

        try {
            const response = await fetch('/api/songs', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('노래가 성공적으로 추가되었습니다!');
                addSongForm.reset(); // 폼 초기화
                fetchAndRenderSongs(); // 목록 새로고침
            } else {
                alert('업로드에 실패했습니다.');
            }
        } catch (error) {
            console.error('노래 추가 중 오류:', error);
            alert('서버와 통신 중 오류가 발생했습니다.');
        }
    });
}

// --- 4. 초기 실행 ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSongs();
    setupEventListeners();
});