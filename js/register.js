document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const registerBtn = document.getElementById('register-btn');
    const messageDiv = document.getElementById('message');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (!username || !password || !confirmPassword) {
            showMessage('모든 필드를 입력해주세요.', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('비밀번호가 일치하지 않습니다.', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('비밀번호는 최소 6자 이상이어야 합니다.', 'error');
            return;
        }
        
        registerBtn.disabled = true;
        registerBtn.textContent = '회원가입 중...';
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                showMessage(data.message || '회원가입에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('회원가입 오류:', error);
            showMessage('서버 연결 오류가 발생했습니다.', 'error');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = '회원가입';
        }
    });
    
    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    }
});
