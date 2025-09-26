export function renderSongTable(songs, songTableBody) {
    songTableBody.innerHTML = '';
    songs.forEach(song => {
        const row = songTableBody.insertRow();
        row.innerHTML = `
            <td>${song.title}</td>
            <td>${song.genre || '-'}</td>
            <td>${song.composer}</td>
            <td>${song.artist}</td>
            <td>${song.date}</td>
            <td><button class="btn btn-lyrics" data-song-id="${song.id}">가사</button></td>
            <td><button class="btn btn-play" data-src="${song.src}">재생</button></td>
            <td><button class="btn btn-add-to-playlist" data-song-id="${song.id}">PL에 추가</button></td>
        `;
    });
}