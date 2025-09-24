// js/api.js

export async function fetchAllSongs() {
    try {
        const response = await fetch('/api/songs');
        if (!response.ok) throw new Error('서버 응답 오류');
        return await response.json();
    } catch (error) {
        console.error("노래 목록을 가져오는 데 실패했습니다:", error);
        return [];
    }
}