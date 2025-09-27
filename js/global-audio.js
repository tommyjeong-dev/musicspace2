// 전역 오디오 플레이어 관리
class GlobalAudioPlayer {
    constructor() {
        this.audio = null;
        this.currentSrc = null;
        this.currentSongTitle = null;
        this.currentTime = 0;
        this.volume = 0.5;
        this.isPlaying = false;
        this.init();
    }

    init() {
        // 기존 전역 오디오 엘리먼트가 있는지 확인
        let existingAudio = document.getElementById('global-music-player');
        
        if (existingAudio) {
            // 기존 오디오 엘리먼트 재사용
            this.audio = existingAudio;
            console.log('기존 전역 오디오 플레이어 재사용');
        } else {
            // 전역 오디오 엘리먼트 생성
            this.audio = document.createElement('audio');
            this.audio.id = 'global-music-player';
            this.audio.controls = false; // 기본 컨트롤 비활성화
            this.audio.preload = 'metadata';
            console.log('새 전역 오디오 플레이어 생성');
        }
        
        // 로컬 스토리지에서 볼륨 설정 복원
        const savedVolume = localStorage.getItem('musicVolume');
        if (savedVolume) {
            this.volume = parseFloat(savedVolume);
            this.audio.volume = this.volume;
        } else {
            this.audio.volume = this.volume;
        }

        // 이벤트 리스너 설정
        this.audio.addEventListener('loadstart', () => {
            console.log('음악 로딩 시작');
        });

        this.audio.addEventListener('canplay', () => {
            console.log('음악 재생 준비 완료');
        });

        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            console.log('음악 재생 시작');
            this.saveCurrentState();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            console.log('음악 일시정지');
            this.saveCurrentState();
        });

        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            console.log('음악 재생 완료');
        });

        this.audio.addEventListener('error', (e) => {
            console.error('음악 재생 오류:', e);
        });

        // 페이지 언로드 시 현재 상태 저장
        window.addEventListener('beforeunload', () => {
            if (this.audio && this.audio.src) {
                localStorage.setItem('globalAudioSrc', this.audio.src);
                localStorage.setItem('globalAudioTime', this.audio.currentTime.toString());
                localStorage.setItem('globalAudioPlaying', this.isPlaying.toString());
                localStorage.setItem('globalAudioTitle', this.currentSongTitle || '');
                console.log('페이지 언로드 시 상태 저장:', {
                    src: this.audio.src,
                    time: this.audio.currentTime,
                    playing: this.isPlaying,
                    title: this.currentSongTitle
                });
            }
        });

        // 페이지 숨김/보임 시에도 상태 저장
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.audio && this.audio.src) {
                this.saveCurrentState();
                console.log('페이지 숨김 시 상태 저장');
            }
        });

        // 페이지 로드 시 이전 상태 복원
        this.restoreState();
        
        // 마우스 커서에 따른 플레이어 표시/숨김 기능
        this.initPlayerVisibility();
        
        // 초기 노래 제목 표시 업데이트
        this.updateSongTitleDisplay();
        
        // 커스텀 플레이어 컨트롤 초기화
        this.initCustomControls();
        
        // 주기적으로 상태 저장 (5초마다)
        setInterval(() => {
            if (this.audio && this.audio.src && !this.audio.paused) {
                this.saveCurrentState();
            }
        }, 5000);
    }

    // 음악 재생
    play(src, songTitle = null) {
        if (!this.audio) return;

        // 노래 제목 업데이트
        if (songTitle) {
            this.currentSongTitle = songTitle;
            this.updateSongTitleDisplay();
        }

        // 같은 음악이면 현재 시간부터 재생
        if (this.currentSrc === src) {
            this.audio.currentTime = this.currentTime;
            this.audio.play();
            return;
        }

        // 새로운 음악이면 처음부터 재생
        this.currentSrc = src;
        this.audio.src = src;
        this.audio.currentTime = 0;
        this.audio.play();
        
        // 상태 저장
        this.saveCurrentState();
    }

    // 음악 일시정지
    pause() {
        if (this.audio) {
            this.audio.pause();
            this.saveCurrentState();
        }
    }

    // 노래 제목 표시 업데이트
    updateSongTitleDisplay() {
        const titleElement = document.getElementById('current-song-title');
        if (titleElement) {
            if (this.currentSongTitle) {
                titleElement.textContent = this.currentSongTitle;
                titleElement.style.color = '#e8f4fd';
            } else {
                titleElement.textContent = '재생할 노래를 선택하세요';
                titleElement.style.color = '#999';
            }
        }
    }

    // 커스텀 플레이어 컨트롤 초기화
    initCustomControls() {
        const playPauseBtn = document.getElementById('play-pause-btn');
        const progressSlider = document.getElementById('progress-slider');
        const progressFill = document.getElementById('progress-fill');
        const currentTimeEl = document.getElementById('current-time');
        const durationEl = document.getElementById('duration');

        if (!playPauseBtn || !this.audio) return;

        // 재생/일시정지 버튼
        playPauseBtn.addEventListener('click', () => {
            if (this.audio.paused) {
                this.audio.play();
            } else {
                this.audio.pause();
            }
        });

        // 진행률 슬라이더
        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                const time = (e.target.value / 100) * this.audio.duration;
                this.audio.currentTime = time;
            });
        }

        // 오디오 이벤트 리스너
        this.audio.addEventListener('play', () => {
            playPauseBtn.textContent = '⏸';
        });

        this.audio.addEventListener('pause', () => {
            playPauseBtn.textContent = '▶';
        });

        this.audio.addEventListener('timeupdate', () => {
            if (this.audio.duration) {
                const progress = (this.audio.currentTime / this.audio.duration) * 100;
                if (progressSlider) progressSlider.value = progress;
                if (progressFill) progressFill.style.width = progress + '%';
                if (currentTimeEl) currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
            }
        });

        this.audio.addEventListener('loadedmetadata', () => {
            if (durationEl) durationEl.textContent = this.formatTime(this.audio.duration);
        });
    }

    // 시간 포맷팅
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // 현재 상태 저장
    saveCurrentState() {
        if (this.audio && this.audio.src) {
            localStorage.setItem('globalAudioSrc', this.audio.src);
            localStorage.setItem('globalAudioTime', this.audio.currentTime.toString());
            localStorage.setItem('globalAudioPlaying', this.isPlaying.toString());
            localStorage.setItem('globalAudioTitle', this.currentSongTitle || '');
            console.log('상태 저장됨:', {
                src: this.audio.src,
                time: this.audio.currentTime,
                playing: this.isPlaying,
                title: this.currentSongTitle
            });
        }
    }

    // 음악 정지
    stop() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.currentSrc = null;
            this.currentTime = 0;
        }
    }

    // 볼륨 설정
    setVolume(volume) {
        this.volume = volume;
        if (this.audio) {
            this.audio.volume = volume;
        }
        localStorage.setItem('musicVolume', volume.toString());
    }

    // 현재 재생 중인 음악 정보 반환
    getCurrentInfo() {
        return {
            src: this.currentSrc,
            currentTime: this.audio ? this.audio.currentTime : 0,
            duration: this.audio ? this.audio.duration : 0,
            isPlaying: this.isPlaying,
            volume: this.volume
        };
    }

    // 페이지 로드 시 이전 상태 복원
    restoreState() {
        const savedSrc = localStorage.getItem('globalAudioSrc');
        const savedTime = localStorage.getItem('globalAudioTime');
        const savedPlaying = localStorage.getItem('globalAudioPlaying');
        const savedTitle = localStorage.getItem('globalAudioTitle');

        if (savedSrc && savedTime) {
            this.currentSrc = savedSrc;
            this.currentTime = parseFloat(savedTime);
            this.currentSongTitle = savedTitle;
            
            console.log('오디오 상태 복원 시작:', {
                src: savedSrc,
                time: savedTime,
                playing: savedPlaying,
                title: savedTitle
            });
            
            // 오디오 소스 설정
            this.audio.src = savedSrc;
            
            // 오디오가 로드될 때까지 기다린 후 시간 설정
            this.audio.addEventListener('loadedmetadata', () => {
                this.audio.currentTime = this.currentTime;
                console.log('오디오 메타데이터 로드 완료, 시간 설정:', this.currentTime);
                
                // 노래 제목 표시 업데이트
                this.updateSongTitleDisplay();
                
                if (savedPlaying === 'true') {
                    // 약간의 지연 후 재생 (페이지 로드 완료 후)
                    setTimeout(() => {
                        this.audio.play().then(() => {
                            console.log('자동 재생 성공');
                        }).catch(e => {
                            console.log('자동 재생 실패 (브라우저 정책):', e);
                        });
                    }, 1000);
                }
            }, { once: true });
            
            // 오디오 로드 오류 처리
            this.audio.addEventListener('error', (e) => {
                console.error('오디오 로드 오류:', e);
                // 오류 시 로컬 스토리지 정리
                localStorage.removeItem('globalAudioSrc');
                localStorage.removeItem('globalAudioTime');
                localStorage.removeItem('globalAudioPlaying');
                localStorage.removeItem('globalAudioTitle');
            }, { once: true });
        }
    }

    // 로그아웃 시 음악 정지
    stopOnLogout() {
        this.stop();
        localStorage.removeItem('globalAudioSrc');
        localStorage.removeItem('globalAudioTime');
        localStorage.removeItem('globalAudioPlaying');
    }

    // 플레이어 표시/숨김 기능 초기화
    initPlayerVisibility() {
        let hideTimer = null;
        const hideDelay = 2000; // 2초 후 숨김

        // 마우스가 하단 50px 영역에 들어왔을 때
        document.addEventListener('mousemove', (e) => {
            const container = document.querySelector('.audio-player-container');
            if (!container) return;

            const isNearBottom = e.clientY > window.innerHeight - 50;
            const isOverPlayer = container.matches(':hover');

            if (isNearBottom || isOverPlayer) {
                // 플레이어 표시
                container.classList.add('visible');
                
                // 기존 타이머 클리어
                if (hideTimer) {
                    clearTimeout(hideTimer);
                    hideTimer = null;
                }
            } else {
                // 타이머 설정하여 일정 시간 후 숨김
                if (!hideTimer) {
                    hideTimer = setTimeout(() => {
                        container.classList.remove('visible');
                        hideTimer = null;
                    }, hideDelay);
                }
            }
        });

        // 플레이어에 마우스가 올라갔을 때는 숨기지 않음
        document.addEventListener('mouseenter', (e) => {
            if (e.target.closest('.audio-player-container')) {
                if (hideTimer) {
                    clearTimeout(hideTimer);
                    hideTimer = null;
                }
            }
        }, true);

        // 음악이 재생 중일 때는 항상 표시
        this.audio.addEventListener('play', () => {
            const container = document.querySelector('.audio-player-container');
            if (container) {
                container.classList.add('visible');
            }
        });

        // 음악이 정지되었을 때는 숨김
        this.audio.addEventListener('pause', () => {
            const container = document.querySelector('.audio-player-container');
            if (container) {
                setTimeout(() => {
                    if (!this.isPlaying) {
                        container.classList.remove('visible');
                    }
                }, 1000);
            }
        });
    }
}

// 전역 인스턴스 생성 (이미 존재하면 재사용)
if (!window.globalAudioPlayer) {
    window.globalAudioPlayer = new GlobalAudioPlayer();
    console.log('전역 오디오 플레이어 초기화 완료');
} else {
    console.log('기존 전역 오디오 플레이어 사용');
    // 기존 플레이어의 상태 복원
    setTimeout(() => {
        window.globalAudioPlayer.restoreState();
    }, 100);
}

// 페이지 전환 시 음악 상태 업데이트
document.addEventListener('DOMContentLoaded', () => {
    // 기존 오디오 플레이어가 있다면 전역 플레이어로 교체
    const existingPlayer = document.getElementById('music-player');
    if (existingPlayer && window.globalAudioPlayer) {
        // 기존 플레이어의 이벤트를 전역 플레이어로 리다이렉트
        const globalPlayer = window.globalAudioPlayer.audio;
        
        // 기존 플레이어를 숨기고 전역 플레이어를 표시
        existingPlayer.style.display = 'none';
        
        // 전역 플레이어를 컨테이너에 추가
        const container = existingPlayer.closest('.audio-player-container');
        if (container) {
            container.insertBefore(globalPlayer, existingPlayer);
        }
    }
});
