export async function fetchAllSongs() {
    try {
        // 먼저 사용자 정보를 확인하여 관리자인지 체크
        const userResponse = await fetch('/api/user', {
            credentials: 'include'
        });
        
        let apiEndpoint = '/api/songs'; // 기본값: 공개 노래만
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user.isAdmin) {
                apiEndpoint = '/api/songs/admin'; // 관리자: 모든 노래
            } else {
                // 일반 사용자: 공개 노래 + 본인 비공개 노래
                apiEndpoint = '/api/songs/main'; // 공개 노래 + 본인 노래
            }
        }
        
        console.log('메인 페이지 노래 API 호출:', apiEndpoint);
        
        const response = await fetch(apiEndpoint, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('서버 응답 오류');
        return await response.json();
    } catch (error) {
        console.error("노래 목록을 가져오는 데 실패했습니다:", error);
        return [];
    }
}