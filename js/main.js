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
const bottomAdminLink = document.getElementById('bottom-admin-link');
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
                
                if (response.status === 401) {
                    alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
                    window.location.href = '/login.html';
                    return;
                }
                
                if (response.ok) {
                    alert('플레이리스트에 노래를 추가했습니다.');
                } else {
                    const error = await response.json();
                    alert(error.message || '노래 추가에 실패했습니다.');
                }
            } catch (error) {
                console.error('플레이리스트에 노래 추가 오류:', error);
                alert('플레이리스트 추가 중 오류가 발생했습니다.');
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
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// 사용자 인증 상태 확인
async function checkAuthStatus() {
    try {
        console.log('=== 인증 상태 확인 시작 ===');
        console.log('현재 쿠키:', document.cookie);
        
        const response = await fetch('/api/user', {
            credentials: 'include',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API 응답 상태:', response.status);
        console.log('API 응답 헤더:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('로그인 상태:', data.user.username, '관리자:', data.user.isAdmin);
            
            // DOM 요소들 확인
            console.log('DOM 요소 확인:');
            console.log('- usernameSpan:', usernameSpan);
            console.log('- userInfo:', userInfo);
            console.log('- logoutBtn:', logoutBtn);
            console.log('- loginLink:', loginLink);
            console.log('- bottomAdminLink:', bottomAdminLink);
            
            // 요소가 존재하는지 확인하고 업데이트
            if (usernameSpan) {
                usernameSpan.textContent = data.user.username;
                console.log('✅ 사용자명 설정:', data.user.username);
            } else {
                console.log('❌ usernameSpan 요소를 찾을 수 없음');
            }
            
            if (userInfo) {
                userInfo.style.display = 'block';
                console.log('✅ 사용자 정보 표시');
            } else {
                console.log('❌ userInfo 요소를 찾을 수 없음');
            }
            
            if (logoutBtn) {
                logoutBtn.style.display = 'inline-block';
                console.log('✅ 로그아웃 버튼 표시');
            } else {
                console.log('❌ logoutBtn 요소를 찾을 수 없음');
            }
            
            if (loginLink) {
                loginLink.style.display = 'none';
                console.log('✅ 로그인 링크 숨김');
            } else {
                console.log('❌ loginLink 요소를 찾을 수 없음');
            }
            
            if (bottomAdminLink) {
                bottomAdminLink.style.display = 'inline-block';
                // 사용자 권한에 따라 하단 링크 텍스트 변경
                if (data.user.isAdmin) {
                    bottomAdminLink.textContent = '관리자 페이지로 이동';
                } else {
                    bottomAdminLink.textContent = '나의 노래 관리하기';
                }
                console.log('✅ 하단 관리자 링크 표시:', bottomAdminLink.textContent);
            } else {
                console.log('❌ bottomAdminLink 요소를 찾을 수 없음');
            }
            
            console.log('=== 로그인 상태 UI 업데이트 완료 ===');
        } else {
            console.log('로그인되지 않은 상태 (응답 상태:', response.status, ')');
            
            if (userInfo) {
                userInfo.style.display = 'none';
                console.log('✅ 사용자 정보 숨김');
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
                console.log('✅ 로그아웃 버튼 숨김');
            }
            if (loginLink) {
                loginLink.style.display = 'inline-block';
                console.log('✅ 로그인 링크 표시');
            }
            if (bottomAdminLink) {
                bottomAdminLink.style.display = 'none';
                console.log('✅ 하단 관리자 링크 숨김');
            }
            
            console.log('=== 비로그인 상태 UI 업데이트 완료 ===');
        }
    } catch (error) {
        console.error('인증 상태 확인 오류:', error);
        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginLink) loginLink.style.display = 'inline-block';
        if (bottomAdminLink) bottomAdminLink.style.display = 'none';
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


async function init() {
    console.log('메인 페이지 초기화 시작');
    
    // 먼저 인증 상태 확인
    await checkAuthStatus();
    
    // 노래 데이터 로드
    allSongs = await fetchAllSongs();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 뷰 업데이트
    updateView();
    
    console.log('메인 페이지 초기화 완료');
}

// 모듈 방식에서 안전한 초기화
async function startApp() {
    console.log('main.js 모듈이 로드되었습니다.');
    console.log('현재 DOM 상태:', document.readyState);
    
    // DOM이 준비될 때까지 기다림
    if (document.readyState === 'loading') {
        console.log('DOM이 아직 로딩 중입니다. DOMContentLoaded 이벤트를 기다립니다.');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM이 로드되었습니다. 초기화를 시작합니다.');
            init();
        });
    } else {
        console.log('DOM이 이미 준비되었습니다. 즉시 초기화를 시작합니다.');
        // 약간의 지연을 두어 DOM이 완전히 준비되도록 함
        setTimeout(() => {
            init();
        }, 100);
    }
}

// 앱 시작
startApp();