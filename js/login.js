document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const messageDiv = document.getElementById('message');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            showMessage('사용자명과 비밀번호를 입력해주세요.', 'error');
            return;
        }
        
        loginBtn.disabled = true;
        loginBtn.textContent = '로그인 중...';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include' // 쿠키 포함
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('로그인 성공!', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                showMessage(data.message || '로그인에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            showMessage('서버 연결 오류가 발생했습니다.', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '로그인';
        }
    });
    
    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    }
});
