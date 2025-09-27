const express = require('express');
const { User, Song, Playlist, sequelize } = require('./database'); // <-- User, Playlist 추가
const { Op } = require('sequelize');
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
            where: { UserId: req.user.id },
            include: [{
                model: Song,
                through: { attributes: [] } // 중간 테이블 속성은 제외
            }]
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
            },
            include: [{
                model: Song,
                through: { attributes: [] }
            }]
        });
        const song = await Song.findByPk(req.body.songId);
        if (!playlist || !song) {
            return res.status(404).json({ message: "플레이리스트 또는 노래를 찾을 수 없습니다." });
        }
        
        // 중복 체크: 이미 플레이리스트에 있는 노래인지 확인
        const isAlreadyAdded = playlist.Songs.some(playlistSong => playlistSong.id === song.id);
        if (isAlreadyAdded) {
            return res.status(409).json({ 
                message: `"${song.title}"은(는) 이미 "${playlist.name}" 플레이리스트에 추가되어 있습니다.`,
                isDuplicate: true
            });
        }
        
        await playlist.addSong(song); // 관계 메서드로 노래 추가
        res.status(200).json({ 
            message: `"${song.title}"을(를) "${playlist.name}" 플레이리스트에 추가했습니다.`,
            song: song
        });
    } catch (error) {
        console.error("플레이리스트에 노래 추가 오류:", error);
        res.status(500).json({ message: "플레이리스트에 노래 추가 중 오류 발생" });
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



// --- 관리자 대시보드 API ---

// 대시보드 통계 조회 (관리자만)
app.get('/api/admin/dashboard', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // 전체 통계 조회
        const totalUsers = await User.count();
        const totalSongs = await Song.count();
        const totalPlaylists = await Playlist.count();
        const publicSongs = await Song.count({ where: { isPublic: true } });
        const privateSongs = await Song.count({ where: { isPublic: false } });
        const adminUsers = await User.count({ where: { isAdmin: true } });

        // 장르별 통계
        const genreStats = await Song.findAll({
            attributes: [
                'genre',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                genre: {
                    [Op.ne]: null
                }
            },
            group: ['genre'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
        });

        // 최근 업로드된 노래 (최근 10개)
        const recentSongs = await Song.findAll({
            include: [{
                model: User,
                attributes: ['username']
            }],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        // 사용자별 노래 수 통계
        const userStats = await User.findAll({
            attributes: [
                'username',
                [sequelize.fn('COUNT', sequelize.col('Songs.id')), 'songCount']
            ],
            include: [{
                model: Song,
                attributes: [],
                required: false
            }],
            group: ['User.id', 'User.username'],
            order: [[sequelize.fn('COUNT', sequelize.col('Songs.id')), 'DESC']]
        });

        res.json({
            overview: {
                totalUsers,
                totalSongs,
                totalPlaylists,
                publicSongs,
                privateSongs,
                adminUsers
            },
            genreStats: genreStats.map(stat => ({
                genre: stat.genre,
                count: parseInt(stat.dataValues.count)
            })),
            recentSongs: recentSongs.map(song => ({
                id: song.id,
                title: song.title,
                artist: song.artist,
                genre: song.genre,
                isPublic: song.isPublic,
                createdAt: song.createdAt,
                uploader: song.User ? song.User.username : 'Unknown'
            })),
            userStats: userStats.map(user => ({
                username: user.username,
                songCount: parseInt(user.dataValues.songCount)
            }))
        });
    } catch (error) {
        console.error("대시보드 통계 조회 오류:", error);
        res.status(500).json({ message: "대시보드 통계 조회 중 오류 발생" });
    }
});

// --- 시스템 관리 API (관리자 전용) ---

// 데이터베이스 백업 (관리자만)
app.get('/api/admin/backup', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // 현재 데이터베이스 파일 경로
        const dbPath = path.join(__dirname, 'database.sqlite');
        const backupPath = path.join(__dirname, 'backups', `backup_${Date.now()}.sqlite`);
        
        // 백업 디렉토리 생성
        const backupDir = path.dirname(backupPath);
        try {
            await fs.mkdir(backupDir, { recursive: true });
        } catch (error) {
            // 디렉토리가 이미 존재하는 경우 무시
        }
        
        // 데이터베이스 파일 복사
        await fs.copyFile(dbPath, backupPath);
        
        res.json({
            message: '데이터베이스 백업이 완료되었습니다.',
            backupPath: backupPath,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("데이터베이스 백업 오류:", error);
        res.status(500).json({ message: "데이터베이스 백업 중 오류 발생" });
    }
});

// 시스템 로그 조회 (관리자만)
app.get('/api/admin/logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // 로그 파일 경로 (실제로는 로그 시스템을 구현해야 함)
        const logPath = path.join(__dirname, 'logs', 'system.log');
        
        try {
            const logContent = await fs.readFile(logPath, 'utf8');
            const logs = logContent.split('\n').filter(line => line.trim()).slice(-100); // 최근 100줄
            
            res.json({
                logs: logs.map((log, index) => ({
                    id: index + 1,
                    content: log,
                    timestamp: new Date().toISOString() // 실제로는 로그에서 파싱해야 함
                }))
            });
        } catch (error) {
            // 로그 파일이 없는 경우 샘플 로그 반환
            res.json({
                logs: [
                    {
                        id: 1,
                        content: `[${new Date().toISOString()}] 시스템 시작됨`,
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 2,
                        content: `[${new Date().toISOString()}] 데이터베이스 연결 성공`,
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        }
    } catch (error) {
        console.error("시스템 로그 조회 오류:", error);
        res.status(500).json({ message: "시스템 로그 조회 중 오류 발생" });
    }
});

// 시스템 상태 조회 (관리자만)
app.get('/api/admin/system-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const os = require('os');
        const fs = require('fs').promises;
        const path = require('path');
        
        // 메모리 사용량
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        // 디스크 사용량 (데이터베이스 파일 기준)
        const dbPath = path.join(__dirname, 'database.sqlite');
        let dbSize = 0;
        try {
            const stats = await fs.stat(dbPath);
            dbSize = stats.size;
        } catch (error) {
            // 파일이 없는 경우
        }
        
        // 서버 업타임
        const uptime = process.uptime();
        
        res.json({
            server: {
                uptime: Math.floor(uptime),
                nodeVersion: process.version,
                platform: os.platform(),
                arch: os.arch()
            },
            memory: {
                total: totalMemory,
                used: usedMemory,
                free: freeMemory,
                usagePercent: Math.round((usedMemory / totalMemory) * 100)
            },
            database: {
                size: dbSize,
                sizeFormatted: formatBytes(dbSize)
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("시스템 상태 조회 오류:", error);
        res.status(500).json({ message: "시스템 상태 조회 중 오류 발생" });
    }
});

// 바이트를 읽기 쉬운 형태로 변환
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- 사용자 관리 API (관리자 전용) ---

// 모든 사용자 목록 조회 (관리자만)
app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'isAdmin', 'createdAt'],
            include: [{
                model: Song,
                attributes: ['id'],
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });
        
        // 각 사용자의 노래 수 계산
        const usersWithStats = users.map(user => ({
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            songCount: user.Songs ? user.Songs.length : 0
        }));
        
        res.json(usersWithStats);
    } catch (error) {
        console.error("사용자 목록 조회 오류:", error);
        res.status(500).json({ message: "사용자 목록 조회 중 오류 발생" });
    }
});

// 사용자 권한 변경 (관리자만)
app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { isAdmin } = req.body;
        
        // 자기 자신의 권한은 변경할 수 없음
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ message: "자기 자신의 권한은 변경할 수 없습니다." });
        }
        
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        }
        
        await user.update({ isAdmin: isAdmin });
        
        res.json({ 
            message: `${user.username}님의 권한이 ${isAdmin ? '관리자' : '일반 사용자'}로 변경되었습니다.`,
            user: {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error("사용자 권한 변경 오류:", error);
        res.status(500).json({ message: "사용자 권한 변경 중 오류 발생" });
    }
});

// 사용자 삭제 (관리자만)
app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 자기 자신은 삭제할 수 없음
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ message: "자기 자신의 계정은 삭제할 수 없습니다." });
        }
        
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        }
        
        // 사용자의 모든 노래와 플레이리스트도 함께 삭제
        await Song.destroy({ where: { UserId: userId } });
        await Playlist.destroy({ where: { UserId: userId } });
        await user.destroy();
        
        res.json({ message: `${user.username}님의 계정이 삭제되었습니다.` });
    } catch (error) {
        console.error("사용자 삭제 오류:", error);
        res.status(500).json({ message: "사용자 삭제 중 오류 발생" });
    }
});

// --- 서버 시작 및 초기 데이터 입력 ---
app.listen(PORT, async () => {
    console.log(`서버가 http://localhost:${PORT} 에서 정상적으로 실행되었습니다.`);
    try {
        await sequelize.sync();
        
        // admin 사용자가 없으면 생성
        let adminUser = await User.findOne({ where: { username: 'admin' } });
        if (!adminUser) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            adminUser = await User.create({
                username: 'admin',
                password: hashedPassword,
                isAdmin: true
            });
            console.log("admin 사용자 생성 완료.");
        }
        
        // testuser 사용자가 없으면 생성
        let testUser = await User.findOne({ where: { username: 'testuser' } });
        if (!testUser) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('test123', 10);
            testUser = await User.create({
                username: 'testuser',
                password: hashedPassword,
                isAdmin: false
            });
            console.log("testuser 사용자 생성 완료.");
        }
        
        const count = await Song.count();
        if (count === 0) {
            console.log("데이터베이스가 비어있어 초기 데이터를 입력합니다...");
            await Song.bulkCreate([
                 { title: "결국엔 괜찮아", date: "2024. 08. 15", artist: "Tommy", composer: "Tommy", genre: "Ballad", src: "music-library/tjmc-k/song-01.wav", lyrics: "가사 준비 중...", UserId: adminUser.id, isPublic: true },
                 { title: "스쳐본 사랑에 대한 질문", date: "2023. 11. 20", artist: "Tommy", composer: "Tommy", genre: "Rock", src: "music-library/tjmc-k/song-02.wav", lyrics: "가사 준비 중...", UserId: adminUser.id, isPublic: true },
                 { title: "날 사랑하지 않는 너", date: "2023. 05. 01", artist: "Tommy", composer: "Tommy", genre: "Pop", src: "music-library/tjmc-k/song-03.wav", lyrics: "가사 준비 중...", UserId: adminUser.id, isPublic: true }
            ]);
            console.log("초기 데이터 입력 완료.");
        }
    } catch (error) {
        console.error("데이터베이스 초기화 중 오류 발생:", error);
    }
});