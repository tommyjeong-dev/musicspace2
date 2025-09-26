const express = require('express');
const { Song, Playlist, sequelize } = require('./database'); // <-- Playlist 추가
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// --- 미들웨어 설정 ---
// form 데이터(POST)를 파싱하기 위해 추가
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (css, js, images 등)
app.use(express.static('.'));
// 음악 파일 제공
app.use('/music-library', express.static(path.join(__dirname, 'music-library')));

// --- 파일 업로드 설정 (Multer) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'music-library/');
    },
    filename: function (req, file, cb) {
        // 한글 파일 이름 깨짐 방지
        const encodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + encodedName);
    }
});
const upload = multer({ storage: storage });

// --- HTML 페이지 라우팅 ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API 엔드포인트 ---

// GET /api/songs : 모든 노래 목록을 가져옵니다.
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.findAll({ order: [['createdAt', 'DESC']] });
        res.json(songs);
    } catch (error) {
        console.error("노래 목록 로딩 오류:", error);
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// GET /api/songs/:id : 특정 id의 노래 정보를 가져옵니다.
app.get('/api/songs/:id', async (req, res) => {
    try {
        const song = await Song.findByPk(req.params.id);
        if (song) {
            res.json(song);
        } else {
            res.status(404).send("해당 노래를 찾을 수 없습니다.");
        }
    } catch (error) {
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// POST /api/songs : 새 노래를 추가합니다.
app.post('/api/songs', upload.single('songFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("음악 파일이 업로드되지 않았습니다.");
        }
        const { title, artist, date, composer, genre, lyrics } = req.body;
        const src = path.join('music-library', req.file.filename).replace(/\\/g, "/");
        const song = await Song.create({ title, artist, date, composer, genre, src, lyrics });
        res.status(201).json(song);
    } catch (error) {
        console.error("새 노래 추가 중 오류:", error);
        res.status(500).send("새 노래를 추가하는 중 서버에서 오류가 발생했습니다.");
    }
});
// PUT /api/songs/:id : 특정 id의 노래 정보를 수정합니다. (파일 제외)
app.put('/api/songs/:id', async (req, res) => {
    try {
        const songId = req.params.id;
        const [updatedRows] = await Song.update(req.body, {
            where: { id: songId }
        });

        if (updatedRows > 0) {
            const updatedSong = await Song.findByPk(songId);
            res.status(200).json(updatedSong);
        } else {
            res.status(404).send("해당 노래를 찾을 수 없습니다.");
        }
    } catch (error) {
        res.status(500).send("노래 정보를 수정하는 중 서버에서 오류가 발생했습니다.");
    }
});
// DELETE /api/songs/:id : 특정 id의 노래를 삭제합니다.
app.delete('/api/songs/:id', async (req, res) => {
    try {
        const deleted = await Song.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send(); // 성공했지만 보낼 내용 없음
        } else {
            res.status(404).send("해당 노래를 찾을 수 없습니다.");
        }
    } catch (error) {
        res.status(500).send("노래를 삭제하는 중 서버에서 오류가 발생했습니다.");
    }
});
// --- 플레이리스트 API ---

// GET /api/playlists : 모든 플레이리스트 목록을 가져옵니다.
app.get('/api/playlists', async (req, res) => {
    try {
        const playlists = await Playlist.findAll();
        res.json(playlists);
    } catch (error) {
        console.error("플레이리스트 목록 조회 오류:", error);
        res.status(500).send("플레이리스트 목록 조회 중 오류 발생");
    }
});

// POST /api/playlists : 새 플레이리스트를 생성합니다.
app.post('/api/playlists', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).send("플레이리스트 이름이 필요합니다.");
        }
        const newPlaylist = await Playlist.create({ name });
        res.status(201).json(newPlaylist);
    } catch (error) {
        console.error("플레이리스트 생성 오류:", error);
        res.status(500).send("플레이리스트 생성 중 오류 발생");
    }
});

// GET /api/playlists/:id : 특정 플레이리스트와 수록곡 정보를 가져옵니다.
app.get('/api/playlists/:id', async (req, res) => {
    try {
        const playlist = await Playlist.findByPk(req.params.id, {
            include: Song // 관계 설정된 Song 모델을 포함하여 조회
        });
        if (playlist) {
            res.json(playlist);
        } else {
            res.status(404).send("플레이리스트를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error("특정 플레이리스트 조회 오류:", error);
        res.status(500).send("특정 플레이리스트 조회 중 오류 발생");
    }
});


// POST /api/playlists/:id/songs : 특정 플레이리스트에 노래를 추가합니다.
app.post('/api/playlists/:id/songs', async (req, res) => {
    try {
        const playlist = await Playlist.findByPk(req.params.id);
        const song = await Song.findByPk(req.body.songId);
        if (!playlist || !song) {
            return res.status(404).send("플레이리스트 또는 노래를 찾을 수 없습니다.");
        }
        await playlist.addSong(song); // 관계 메서드로 노래 추가
        res.status(200).json(song);
    } catch (error) {
        console.error("플레이리스트에 노래 추가 오류:", error);
        res.status(500).send("플레이리스트에 노래 추가 중 오류 발생");
    }
});

// DELETE /api/playlists/:playlistId/songs/:songId : 특정 플레이리스트에서 노래를 삭제합니다.
app.delete('/api/playlists/:playlistId/songs/:songId', async (req, res) => {
    try {
        const { playlistId, songId } = req.params;
        const playlist = await Playlist.findByPk(playlistId);
        const song = await Song.findByPk(songId);
        if (!playlist || !song) {
            return res.status(404).send("플레이리스트 또는 노래를 찾을 수 없습니다.");
        }
        await playlist.removeSong(song); // 관계 메서드로 노래 삭제
        res.status(200).send("노래가 삭제되었습니다.");
    } catch (error) {
        console.error("플레이리스트에서 노래 삭제 오류:", error);
        res.status(500).send("플레이리스트에서 노래 삭제 중 오류 발생");
    }
});

// PUT /api/playlists/:id : 특정 플레이리스트의 이름을 수정합니다.
app.put('/api/playlists/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const [updatedRows] = await Playlist.update({ name }, {
            where: { id: req.params.id }
        });

        if (updatedRows > 0) {
            res.status(200).send("플레이리스트 이름이 수정되었습니다.");
        } else {
            res.status(404).send("플레이리스트를 찾을 수 없습니다.");
        }
    } catch (error) {
        res.status(500).send("플레이리스트 이름 수정 중 오류 발생");
    }
});

// DELETE /api/playlists/:id : 특정 플레이리스트를 삭제합니다.
app.delete('/api/playlists/:id', async (req, res) => {
    try {
        const deleted = await Playlist.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).send("플레이리스트를 찾을 수 없습니다.");
        }
    } catch (error) {
        res.status(500).send("플레이리스트 삭제 중 오류 발생");
    }
});



// --- 서버 시작 및 초기 데이터 입력 ---
app.listen(PORT, async () => {
    console.log(`서버가 http://localhost:${PORT} 에서 정상적으로 실행되었습니다.`);
    try {
        await sequelize.sync();
        const count = await Song.count();
        if (count === 0) {
            console.log("데이터베이스가 비어있어 초기 데이터를 입력합니다...");
            await Song.bulkCreate([
                 { title: "결국엔 괜찮아", date: "2024. 08. 15", artist: "Tommy", composer: "Tommy", genre: "Ballad", src: "music-library/tjmc-k/song-01.wav", lyrics: "가사 준비 중..." },
                 { title: "스쳐본 사랑에 대한 질문", date: "2023. 11. 20", artist: "Tommy", composer: "Tommy", genre: "Rock", src: "music-library/tjmc-k/song-02.wav", lyrics: "가사 준비 중..." },
                 { title: "날 사랑하지 않는 너", date: "2023. 05. 01", artist: "Tommy", composer: "Tommy", genre: "Pop", src: "music-library/tjmc-k/song-03.wav", lyrics: "가사 준비 중..." }
            ]);
            console.log("초기 데이터 입력 완료.");
        }
    } catch (error) {
        console.error("데이터베이스 초기화 중 오류 발생:", error);
    }
});