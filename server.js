const express = require('express');
const { User, Song, Playlist, sequelize } = require('./database'); // <-- User, Playlist 추가
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// --- 미들웨어 설정 ---
// form 데이터(POST)를 파싱하기 위해 추가
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // HTTPS에서는 true로 설정
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

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

// --- Passport 설정 ---
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findOne({ where: { username: username } });
            if (!user) {
                return done(null, false, { message: '사용자를 찾을 수 없습니다.' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return done(null, false, { message: '비밀번호가 올바르지 않습니다.' });
            }
            
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

// --- HTML 페이지 라우팅 ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// --- 인증 미들웨어 ---
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: '로그인이 필요합니다.' });
};

// --- 관리자 권한 체크 미들웨어 ---
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    res.status(403).json({ message: '관리자 권한이 필요합니다.' });
};

// --- API 엔드포인트 ---

// POST /api/register : 회원가입
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: '사용자명과 비밀번호가 필요합니다.' });
        }
        
        // 사용자명 중복 확인
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
        }
        
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 새 사용자 생성
        const newUser = await User.create({
            username,
            password: hashedPassword
        });
        
        res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: newUser.id });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ message: '회원가입 중 오류가 발생했습니다.' });
    }
});

// POST /api/login : 로그인
app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.json({ 
        message: '로그인 성공', 
        user: { id: req.user.id, username: req.user.username } 
    });
});

// POST /api/logout : 로그아웃
app.post('/api/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
        }
        res.json({ message: '로그아웃되었습니다.' });
    });
});

// GET /api/user : 현재 사용자 정보
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: { id: req.user.id, username: req.user.username, isAdmin: req.user.isAdmin } });
    } else {
        res.status(401).json({ message: '로그인이 필요합니다.' });
    }
});

// GET /api/songs : 공개 노래 목록을 가져옵니다.
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.findAll({ 
            where: { isPublic: true },
            order: [['createdAt', 'DESC']] 
        });
        res.json(songs);
    } catch (error) {
        console.error("노래 목록 로딩 오류:", error);
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// GET /api/songs/main : 로그인한 사용자용 메인 페이지 노래 목록 (공개 노래 + 본인 비공개 노래)
app.get('/api/songs/main', isAuthenticated, async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const songs = await Song.findAll({
            where: {
                [Op.or]: [
                    { isPublic: true }, // 모든 공개 노래
                    { UserId: req.user.id } // 본인의 모든 노래 (공개 + 비공개)
                ]
            },
            order: [['createdAt', 'DESC']]
        });
        res.json(songs);
    } catch (error) {
        console.error("메인 페이지 노래 목록 로딩 오류:", error);
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// GET /api/songs/my : 현재 사용자의 모든 노래 목록을 가져옵니다.
app.get('/api/songs/my', isAuthenticated, async (req, res) => {
    try {
        const songs = await Song.findAll({ 
            where: { UserId: req.user.id },
            order: [['createdAt', 'DESC']] 
        });
        res.json(songs);
    } catch (error) {
        console.error("내 노래 목록 로딩 오류:", error);
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// GET /api/songs/admin : 관리자용 - 모든 노래 목록을 가져옵니다.
app.get('/api/songs/admin', isAdmin, async (req, res) => {
    try {
        const songs = await Song.findAll({ 
            include: [{
                model: User,
                attributes: ['id', 'username']
            }],
            order: [['createdAt', 'DESC']] 
        });
        res.json(songs);
    } catch (error) {
        console.error("관리자 노래 목록 로딩 오류:", error);
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// GET /api/songs/:id : 특정 id의 노래 정보를 가져옵니다.
app.get('/api/songs/:id', async (req, res) => {
    try {
        const song = await Song.findByPk(req.params.id);
        if (song) {
            console.log('노래 접근 요청:', {
                songId: req.params.id,
                isPublic: song.isPublic,
                songUserId: song.UserId,
                isAuthenticated: req.isAuthenticated(),
                currentUserId: req.user ? req.user.id : null,
                isAdmin: req.user ? req.user.isAdmin : null
            });
            
            // 공개 노래이거나, 로그인한 사용자가 본인 노래이거나, 관리자인 경우 접근 허용
            if (song.isPublic || 
                (req.isAuthenticated() && song.UserId === req.user.id) || 
                (req.isAuthenticated() && req.user.isAdmin)) {
                console.log('접근 허용');
                res.json(song);
            } else {
                console.log('접근 거부');
                res.status(403).send("접근 권한이 없습니다.");
            }
        } else {
            res.status(404).send("해당 노래를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('노래 접근 오류:', error);
        res.status(500).send("서버에서 오류가 발생했습니다.");
    }
});

// POST /api/songs : 새 노래를 추가합니다.
app.post('/api/songs', isAuthenticated, upload.single('songFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("음악 파일이 업로드되지 않았습니다.");
        }
        const { title, artist, date, composer, genre, lyrics, isPublic } = req.body;
        const src = path.join('music-library', req.file.filename).replace(/\\/g, "/");
        const song = await Song.create({ 
            title, 
            artist, 
            date, 
            composer, 
            genre, 
            src, 
            lyrics, 
            isPublic: isPublic === 'true',
            UserId: req.user.id
        });
        res.status(201).json(song);
    } catch (error) {
        console.error("새 노래 추가 중 오류:", error);
        res.status(500).send("새 노래를 추가하는 중 서버에서 오류가 발생했습니다.");
    }
});
// PUT /api/songs/:id : 특정 id의 노래 정보를 수정합니다. (파일 제외)
app.put('/api/songs/:id', isAuthenticated, async (req, res) => {
    try {
        const songId = req.params.id;
        const song = await Song.findOne({
            where: { 
                id: songId,
                UserId: req.user.id 
            }
        });
        
        if (!song) {
            return res.status(404).send("해당 노래를 찾을 수 없거나 수정 권한이 없습니다.");
        }
        
        const updateData = { ...req.body };
        if (updateData.isPublic !== undefined) {
            updateData.isPublic = updateData.isPublic === 'true';
        }
        
        const [updatedRows] = await Song.update(updateData, {
            where: { 
                id: songId,
                UserId: req.user.id 
            }
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

// PUT /api/songs/:id/admin : 관리자용 - 특정 id의 노래 정보를 수정합니다.
app.put('/api/songs/:id/admin', isAdmin, async (req, res) => {
    try {
        const songId = req.params.id;
        const song = await Song.findByPk(songId);
        
        if (!song) {
            return res.status(404).send("해당 노래를 찾을 수 없습니다.");
        }
        
        const updateData = { ...req.body };
        if (updateData.isPublic !== undefined) {
            updateData.isPublic = updateData.isPublic === 'true';
        }
        
        const [updatedRows] = await Song.update(updateData, {
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
app.delete('/api/songs/:id', isAuthenticated, async (req, res) => {
    try {
        const deleted = await Song.destroy({
            where: { 
                id: req.params.id,
                UserId: req.user.id 
            }
        });
        if (deleted) {
            res.status(204).send(); // 성공했지만 보낼 내용 없음
        } else {
            res.status(404).send("해당 노래를 찾을 수 없거나 삭제 권한이 없습니다.");
        }
    } catch (error) {
        res.status(500).send("노래를 삭제하는 중 서버에서 오류가 발생했습니다.");
    }
});

// DELETE /api/songs/:id/admin : 관리자용 - 특정 id의 노래를 삭제합니다.
app.delete('/api/songs/:id/admin', isAdmin, async (req, res) => {
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

// GET /api/playlists : 현재 사용자의 플레이리스트 목록을 가져옵니다.
app.get('/api/playlists', isAuthenticated, async (req, res) => {
    try {
        const playlists = await Playlist.findAll({
            where: { UserId: req.user.id }
        });
        res.json(playlists);
    } catch (error) {
        console.error("플레이리스트 목록 조회 오류:", error);
        res.status(500).send("플레이리스트 목록 조회 중 오류 발생");
    }
});

// POST /api/playlists : 새 플레이리스트를 생성합니다.
app.post('/api/playlists', isAuthenticated, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).send("플레이리스트 이름이 필요합니다.");
        }
        const newPlaylist = await Playlist.create({ 
            name, 
            UserId: req.user.id 
        });
        res.status(201).json(newPlaylist);
    } catch (error) {
        console.error("플레이리스트 생성 오류:", error);
        res.status(500).send("플레이리스트 생성 중 오류 발생");
    }
});

// GET /api/playlists/:id : 특정 플레이리스트와 수록곡 정보를 가져옵니다.
app.get('/api/playlists/:id', isAuthenticated, async (req, res) => {
    try {
        const playlist = await Playlist.findOne({
            where: { 
                id: req.params.id,
                UserId: req.user.id 
            },
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
app.post('/api/playlists/:id/songs', isAuthenticated, async (req, res) => {
    try {
        const playlist = await Playlist.findOne({
            where: { 
                id: req.params.id,
                UserId: req.user.id 
            }
        });
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
app.delete('/api/playlists/:playlistId/songs/:songId', isAuthenticated, async (req, res) => {
    try {
        const { playlistId, songId } = req.params;
        const playlist = await Playlist.findOne({
            where: { 
                id: playlistId,
                UserId: req.user.id 
            }
        });
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
app.put('/api/playlists/:id', isAuthenticated, async (req, res) => {
    try {
        const { name } = req.body;
        const [updatedRows] = await Playlist.update({ name }, {
            where: { 
                id: req.params.id,
                UserId: req.user.id 
            }
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
app.delete('/api/playlists/:id', isAuthenticated, async (req, res) => {
    try {
        const deleted = await Playlist.destroy({
            where: { 
                id: req.params.id,
                UserId: req.user.id 
            }
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