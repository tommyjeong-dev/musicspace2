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

    // 날짜 형식 검증 및 포맷팅 함수들
    function formatDateInput(input) {
        let value = input.value.replace(/[^0-9]/g, ''); // 숫자만 추출
        
        if (value.length >= 4) {
            value = value.substring(0, 4) + '.' + value.substring(4);
        }
        if (value.length >= 7) {
            value = value.substring(0, 7) + '.' + value.substring(7, 9);
        }
        
        input.value = value;
    }
    
    function validateDate(dateString) {
        const datePattern = /^(\d{4})\.(\d{2})\.(\d{2})$/;
        const match = dateString.match(datePattern);
        
        if (!match) {
            return { isValid: false, message: 'YYYY.MM.DD 형식으로 입력하세요 (예: 2025.01.01)' };
        }
        
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        
        // 기본 범위 검증
        if (year < 1900 || year > 2100) {
            return { isValid: false, message: '연도는 1900-2100 사이여야 합니다.' };
        }
        if (month < 1 || month > 12) {
            return { isValid: false, message: '월은 01-12 사이여야 합니다.' };
        }
        if (day < 1 || day > 31) {
            return { isValid: false, message: '일은 01-31 사이여야 합니다.' };
        }
        
        // 실제 날짜 유효성 검증
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return { isValid: false, message: '유효하지 않은 날짜입니다.' };
        }
        
        return { isValid: true, message: '' };
    }

    // URL에서 노래 ID와 관리자 모드 가져오기 (예: edit.html?id=4&admin=true)
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('id');
    const isAdminMode = urlParams.get('admin') === 'true';

    if (!songId) {
        alert('잘못된 접근입니다.');
        // 사용자 권한에 따라 다른 페이지로 리다이렉트
        try {
            const userResponse = await fetch('/api/user', {
                credentials: 'include'
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData.user.isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'admin.html'; // 일반 사용자도 admin.html로 (나의 노래 관리)
                }
            } else {
                window.location.href = 'index.html'; // 로그인되지 않은 경우 메인 페이지로
            }
        } catch (error) {
            console.error('사용자 정보 확인 오류:', error);
            window.location.href = 'index.html'; // 기본값
        }
        return;
    }

    // --- 2. 사용자 인증 상태 확인 및 하단 링크 설정 ---
    try {
        const userResponse = await fetch('/api/user', {
            credentials: 'include'
        });
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            const homeLink = document.querySelector('.home-link-container a');
            
            if (homeLink) {
                if (userData.user.isAdmin) {
                    homeLink.textContent = '관리자 페이지로 돌아가기';
                } else {
                    homeLink.textContent = '나의 노래 관리하기';
                }
                console.log('하단 링크 텍스트 설정:', homeLink.textContent);
            }
        }
    } catch (error) {
        console.error('사용자 정보 확인 오류:', error);
    }

    // --- 3. 페이지 로딩 시 기존 데이터 불러오기 ---
    try {
        console.log('노래 데이터 로딩 시작, ID:', songId);
        const response = await fetch(`/api/songs/${songId}`, {
            credentials: 'include'
        });
        
        console.log('데이터 로딩 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('데이터 로딩 실패:', response.status, errorText);
            throw new Error(`노래 정보를 불러오지 못했습니다. (상태: ${response.status})`);
        }
        
        const song = await response.json();
        console.log('로딩된 노래 데이터:', song);
        
        // 폼에 기존 데이터 채워넣기
        titleInput.value = song.title;
        artistInput.value = song.artist || '';
        composerInput.value = song.composer || '';
        dateInput.value = song.date || '';
        genreInput.value = song.genre || '';
        lyricsInput.value = song.lyrics || '';
        isPublicSelect.value = song.isPublic ? 'true' : 'false';
        
        console.log('폼 데이터 설정 완료');

    } catch (error) {
        console.error('데이터 로딩 오류:', error);
        alert(`데이터를 불러오는 중 오류가 발생했습니다.\n오류: ${error.message}`);
    }

    // --- 3. 이벤트 리스너 설정 ---
    
    // 날짜 입력 필드 이벤트
    if (dateInput) {
        // 실시간 포맷팅
        dateInput.addEventListener('input', (e) => {
            formatDateInput(e.target);
        });
        
        // 포커스 아웃 시 검증
        dateInput.addEventListener('blur', (e) => {
            const validation = validateDate(e.target.value);
            if (!validation.isValid) {
                e.target.style.borderColor = '#e74c3c';
                e.target.title = validation.message;
            } else {
                e.target.style.borderColor = '#27ae60';
                e.target.title = '';
            }
        });
        
        // 포커스 시 스타일 초기화
        dateInput.addEventListener('focus', (e) => {
            e.target.style.borderColor = '';
            e.target.title = '';
        });
    }

    // --- 4. 폼 제출(저장) 이벤트 처리 ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // 날짜 검증
        const dateValidation = validateDate(dateInput.value);
        if (!dateValidation.isValid) {
            alert(dateValidation.message);
            dateInput.focus();
            return;
        }

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
            console.log('수정 요청:', updateEndpoint, updatedData);
            
            const response = await fetch(updateEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
                credentials: 'include'
            });

            console.log('응답 상태:', response.status);
            console.log('응답 헤더:', response.headers);

            if (response.ok) {
                const result = await response.json();
                console.log('수정 성공:', result);
                alert('성공적으로 수정되었습니다.');
                
                // 사용자 권한에 따라 다른 페이지로 리다이렉트
                try {
                    const userResponse = await fetch('/api/user', {
                        credentials: 'include'
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        if (userData.user.isAdmin) {
                            window.location.href = 'admin.html'; // 관리자 페이지로 복귀
                        } else {
                            window.location.href = 'admin.html'; // 일반 사용자도 admin.html로 (나의 노래 관리)
                        }
                    } else {
                        window.location.href = 'admin.html'; // 기본값
                    }
                } catch (error) {
                    console.error('사용자 정보 확인 오류:', error);
                    window.location.href = 'admin.html'; // 기본값
                }
            } else {
                const errorText = await response.text();
                console.error('수정 실패:', response.status, errorText);
                alert(`수정에 실패했습니다. (상태: ${response.status})\n오류: ${errorText}`);
            }
        } catch (error) {
            console.error('수정 중 오류:', error);
            alert(`서버와 통신 중 오류가 발생했습니다.\n오류: ${error.message}`);
        }
    });
});