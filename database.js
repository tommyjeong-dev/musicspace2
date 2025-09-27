const { Sequelize, DataTypes } = require('sequelize');

// 데이터베이스 연결 설정
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
});

// --- 모델 정의 ---

// User 모델 (새로 추가)
const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // 사용자 이름은 중복되면 안 됨
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false // 기본값은 일반 사용자
    }
});

// Song 모델
const Song = sequelize.define('Song', {
    title: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING },
    artist: { type: DataTypes.STRING },
    composer: { type: DataTypes.STRING },
    genre: { type: DataTypes.STRING },
    src: { type: DataTypes.STRING, allowNull: false },
    lyrics: { type: DataTypes.TEXT },
    isPublic: { 
        type: DataTypes.BOOLEAN, 
        allowNull: false, 
        defaultValue: true // 기본값은 공개
    },
    UserId: { 
        type: DataTypes.INTEGER, 
        allowNull: false // 노래 업로더 정보
    }
});

// Playlist 모델
const Playlist = sequelize.define('Playlist', {
    name: { type: DataTypes.STRING, allowNull: false }
});


// --- 관계 설정 ---

// User와 Song (한 명의 유저는 여러 노래를 업로드할 수 있음)
User.hasMany(Song);
Song.belongsTo(User);

// User와 Playlist (한 명의 유저는 여러 플레이리스트를 가짐)
User.hasMany(Playlist);
Playlist.belongsTo(User);

// Playlist와 Song (하나의 플레이리스트는 여러 노래를 가짐)
const PlaylistSongs = sequelize.define('PlaylistSongs', {});
Song.belongsToMany(Playlist, { through: PlaylistSongs });
Playlist.belongsToMany(Song, { through: PlaylistSongs });


// --- 내보내기 ---
module.exports = { User, Song, Playlist, sequelize }; // User 추가