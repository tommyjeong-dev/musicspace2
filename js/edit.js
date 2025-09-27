// js/edit.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. 전역 변수 및 초기 설정 ---
    const form = document.getElementById('edit-song-form');
    const titleInput = document.getElementById('title');
    const artistInput = document.getElementById('artist');
    const composerInput = document.getElementById('composer');
    const dateInput = document.getElementById('date');
    const genreInput = document.getElementById('genre');
    const lyricsInput = document.getElementById('lyrics');
    const isPublicSelect = document.getElementById('isPublic');

    // URL에서 노래 ID와 관리자 모드 가져오기 (예: edit.html?id=4&admin=true)
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('id');
    const isAdminMode = urlParams.get('admin') === 'true';

    if (!songId) {
        alert('잘못된 접근입니다.');
        window.location.href = 'admin.html';
        return;
    }

    // --- 2. 페이지 로딩 시 기존 데이터 불러오기 ---
    try {
        const response = await fetch(`/api/songs/${songId}`);
        if (!response.ok) throw new Error('노래 정보를 불러오지 못했습니다.');
        
        const song = await response.json();
        
        // 폼에 기존 데이터 채워넣기
        titleInput.value = song.title;
        artistInput.value = song.artist || '';
        composerInput.value = song.composer || '';
        dateInput.value = song.date || '';
        genreInput.value = song.genre || '';
        lyricsInput.value = song.lyrics || '';
        isPublicSelect.value = song.isPublic ? 'true' : 'false';

    } catch (error) {
        console.error('데이터 로딩 오류:', error);
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
    }

    // --- 3. 폼 제출(저장) 이벤트 처리 ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 폼에서 수정된 데이터 가져오기
        const updatedData = {
            title: titleInput.value,
            artist: artistInput.value,
            composer: composerInput.value,
            date: dateInput.value,
            genre: genreInput.value,
            lyrics: lyricsInput.value,
            isPublic: isPublicSelect.value
        };

        try {
            const updateEndpoint = isAdminMode ? `/api/songs/${songId}/admin` : `/api/songs/${songId}`;
            const response = await fetch(updateEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
                credentials: 'include'
            });

            if (response.ok) {
                alert('성공적으로 수정되었습니다.');
                window.location.href = 'admin.html'; // 관리자 페이지로 복귀
            } else {
                alert('수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('수정 중 오류:', error);
            alert('서버와 통신 중 오류가 발생했습니다.');
        }
    });
});