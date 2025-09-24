const express = require('express');
const { Song, Playlist, sequelize } = require('./database'); // <-- 이 줄이 맞습니다.
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// 'css', 'images' 같은 폴더의 파일들을 제공하는 설정
app.use(express.static('.'));
// --- API 엔드포인트 ---
// GET /api/songs : 모든 노래 목록을 가져옵니다.
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.findAll();
        res.json(songs);
    } catch (error) {
        console.error("노래 목록 로딩 오류:", error);
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// 홈페이지('/')로 접속하면 index.html 파일을 보내주는 설정
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`서버가 http://localhost:${PORT} 에서 정상적으로 실행되었습니다.`);
    
    // 데이터베이스 동기화 및 초기 데이터 입력
    try {
        await sequelize.sync(); // DB와 모델 동기화
        const count = await Song.count();
        if (count === 0) {
            console.log("데이터베이스가 비어있어 초기 데이터를 입력합니다...");
            await Song.bulkCreate([
     { title: "결국엔 괜찮아", date: "2024. 08. 15", artist: "Tommy", composer: "Tommy", genre: "Ballad", src: "music-library/tjmc-k/song-01.wav" },
     { title: "스쳐본 사랑에 대한 질문", date: "2023. 11. 20", artist: "Tommy", composer: "Tommy", genre: "Rock", src: "music-library/tjmc-k/song-02.wav" },
     { title: "날 사랑하지 않는 너", date: "2023. 05. 01", artist: "Tommy", composer: "Tommy", genre: "Pop", src: "music-library/tjmc-k/song-03.wav" }
]);
            console.log("초기 데이터 입력 완료.");
        }
    } catch (error) {
        console.error("데이터베이스 초기화 중 오류 발생:", error);
    }
});