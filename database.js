const { Sequelize, DataTypes } = require('sequelize');

// 데이터베이스 연결 설정
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false // (선택 사항) 터미널에 SQL 쿼리 로그를 끄려면 추가
});

// Song 모델 (테이블) 정의
const Song = sequelize.define('Song', {
    title: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING },
    artist: { type: DataTypes.STRING },
    composer: { type: DataTypes.STRING },
    genre: { type: DataTypes.STRING },
    src: { type: DataTypes.STRING, allowNull: false },
    lyrics: { type: DataTypes.TEXT }
});

// Playlist 모델 (테이블) 정의
const Playlist = sequelize.define('Playlist', {
    name: { type: DataTypes.STRING, allowNull: false }
});

// 관계 설정 (Many-to-Many)
const PlaylistSongs = sequelize.define('PlaylistSongs', {});
Song.belongsToMany(Playlist, { through: PlaylistSongs });
Playlist.belongsToMany(Song, { through: PlaylistSongs });

// 다른 파일에서 사용할 수 있도록 내보내기
module.exports = { Song, Playlist, sequelize };