var redirect_uri = "http://127.0.0.1:5500/index.html"

var client_id = "";
var client_secret= "";
var access_token = null;
var refresh_token = null;
var currentPlaylist = "";
var radioButtons = [];

//Variaveis usadas na chamada da API
const AUTHORIZE         = "https://accounts.spotify.com/authorize"
const TOKEN             = "https://accounts.spotify.com/api/token";
const PLAYLISTS         = "https://api.spotify.com/v1/me/playlists";
const DEVICES           = "https://api.spotify.com/v1/me/player/devices";
const PLAY              = "https://api.spotify.com/v1/me/player/play";
const PAUSE             = "https://api.spotify.com/v1/me/player/pause";
const NEXT              = "https://api.spotify.com/v1/me/player/next";
const PREVIOUS          = "https://api.spotify.com/v1/me/player/previous";
const PLAYER            = "https://api.spotify.com/v1/me/player";
const TRACKS            = "https://api.spotify.com/v1/playlists/{{PlaylistId}}/tracks";
const CURRENTLYPLAYING  = "https://api.spotify.com/v1/me/player/currently-playing";
const SHUFFLE           = "https://api.spotify.com/v1/me/player/shuffle";

//Controle do que aparecer em tela.
let playPause   = true;
let device      = false;
let playlists   = false;
let musics      = false;

function onPageLoad(){
    client_id = localStorage.getItem("client_id")
    client_secret = localStorage.getItem("client_secret")

    if ( window.location.search.length > 0 ) {
        handleRedirect();
    }
    else{
        access_token = localStorage.getItem("access_token");
        if ( access_token == null ){
            // we don't have an access token so present token section
            document.getElementById("tokenSection").style.display = 'block'; 
            console.log("Cai aqui") 
        }
        else {
            // we have an access token so present device section
            document.getElementById("deviceSection").style.display = 'block'; 
            document.getElementById('pause').style.display = 'none';
            document.getElementById("deviceArea").style.display = 'none';
            document.getElementById("playlistArea").style.display = 'none';  
            document.getElementById("musicArea").style.display = 'none'; 
            refreshDevices();
            refreshPlaylists();
            currentlyPlaying();
        }
    }
}

function refreshAccessToken(){
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}

function handleRedirect(){
    let code = getCode();
    fetchAccessToken(code);
    window.history.pushState("", "", redirect_uri);
}

function fetchAccessToken(code){
    let corpo = "grant_type=authorization_code";
    corpo += "&code=" + code; 
    corpo += "&redirect_uri=" + encodeURI(redirect_uri);
    corpo += "&client_id=" + client_id;
    corpo += "&client_secret=" + client_secret;
    callAuthorizationApi(corpo);
}

function callAuthorizationApi(body){
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

function handleAuthorizationResponse(){
    if (this.status == 200){
        var data = JSON.parse(this.responseText);
        console.log(data);
        if (data.access_token != undefined){
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if (data.refresh_token  != undefined){
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

function getCode(){
    let codigo = null;
    const textoConsulta = window.location.search;
    if (textoConsulta.length > 0){
        const urlParams = new URLSearchParams(textoConsulta);
        codigo = urlParams.get('code')
    }
    return codigo;
}

function requestAuthorization(){
    client_id = document.getElementById("clientId").value;
    client_secret = document.getElementById("clientSecret").value;
    localStorage.setItem("client_id", client_id);
    localStorage.setItem("client_secret", client_secret); // In a real app you should not expose your client_secret to the user
    
    let url = AUTHORIZE;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
    window.location.href = url; // Show Spotify's authorization screen
}

//Área para habilitar as áreas de busca de cada item
//Dispositivos disponiveis
function openDevices(){
    if (document.getElementById("deviceArea").style.display == 'none') {
        document.getElementById("deviceArea").style.display = '';
    }else{
        document.getElementById("deviceArea").style.display = 'none';
    }
}

//PlayLists disponiveis
function openPlaylists(){
    if (document.getElementById("playlistArea").style.display == 'none') {
        document.getElementById("playlistArea").style.display = '';
    }else{
        document.getElementById("playlistArea").style.display = 'none';
    }
}

//Músicas disponiveis 
function openTracks(){
    if (document.getElementById("musicArea").style.display == 'none') {
        document.getElementById("musicArea").style.display = '';
    }else{
        document.getElementById("musicArea").style.display = 'none';
    }
}

//Rotina para a chamada da API,
//necessario passar: método, url, corpo da api, uma chamada para callback
function callApi(method, url, body, callback){
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;
}

//Captura o ID do dispositivo selecionado para onde ele irá começar a tocar.
function deviceId(){
    return document.getElementById("devices").value;
}


//Início da rotina dos dispositivos

//Chamada da API
function refreshDevices(){
    callApi("GET", DEVICES, null, handleDevicesResponse);
}

function handleDevicesResponse(){
    //Confiro o status retornado da api
    if (this.status == 200){
        var data = JSON.parse(this.responseText);
        console.log(data);
        //Limpo os dipositivos da memória para então acrescentar o que me foi retornado
        removeAllItems("devices");
        data.devices.forEach(item => addDevice(item));
    }
    else if(this.status == 401){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

//Função para acrescentar os dispositivos
function addDevice(item){
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name;
    document.getElementById("devices").appendChild(node); 
}

//Início da rotina das PlayLists

//Chamada da api
function refreshPlaylists(){
    callApi("GET", PLAYLISTS, null, handlePlaylistsResponse)
}

function handlePlaylistsResponse(){
    //Confiro o status retornado da api
    if (this.status == 200){
        var data = JSON.parse(this.responseText);
        console.log(data);
        //Removo os itens da memória para cadastrar os novos
        removeAllItems("playlists");
        data.items.forEach(item => addPlaylist(item));
    }
    else if(this.status == 401){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

//Adiciono os itens das playlists possiveis
function addPlaylist(item){
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name + " (" + item.tracks.total + ")";
    document.getElementById("playlists").appendChild(node); 
}

//Inicio da rotina para as músicas

//Com base na playlist selecionada, chamo a API das músicas
function fetchTracks(){
    let playlist_id = document.getElementById("playlists").value;
    if ( playlist_id.length > 0 ){
        url = TRACKS.replace("{{PlaylistId}}", playlist_id);
        callApi( "GET", url, null, handleTracksResponse );
    }
}

function handleTracksResponse(){
    //Confiro o status da api
    if (this.status == 200){
        var data = JSON.parse(this.responseText);
        console.log(data);
        //Removo todas as músicas anteriores possíveis
        removeAllItems("tracks");
        //Preencho com as novas músicas da playlist
        data.items.forEach((item, index) => addTracks(item, index));
    }
    else if(this.status == 401){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

//Adiciono as músicas para serem escolhidas
function addTracks(item, index){
    let node = document.createElement("option");
    node.value = index;
    node.innerHTML = item.track.name + " (" + item.track.artists[0].name + ")";
    document.getElementById("tracks").appendChild(node); 
}

//Rotina para remover os itens do elemento desejado
function removeAllItems( elementId ){
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

//Verifica qual botão será mostrado ná area de play, baseado no seu atual status.
function playOrPauseMusic(){
    if (playPause){
        playMusic();
        playOrPauseCheck(playPause);
        
    } else {
        pauseMusic();
        playOrPauseCheck(playPause);
    }
}

//Habilita o botão de Play e Pause para apacerer 
function playOrPauseCheck(actualValue){
    if(actualValue){
        playPause = false;
        //Esconde botão no Play
        document.getElementById('pause').style.display = '';
        document.getElementById('play').style.display = 'none';
    } else {
        playPause = true;
        //Esconde botão no pause
        document.getElementById('play').style.display = '';
        document.getElementById('pause').style.display = 'none';
    }
}

//Da inicio a música selecionada
function playMusic(){
    //Captura qual foi a música selecionada
    let playlist_id = document.getElementById("playlists").value;
    let trackindex = document.getElementById("tracks").value;
    console.log(trackindex);
    //Cria o corpo da api a ser enviada
    let body = {};
    body.context_uri = "spotify:playlist:" + playlist_id;
    body.offset = {};
    body.offset.position = trackindex.length > 0 ? Number(trackindex) : 0;
    body.offset.position_ms = 0;
    //Avisa que a música vai ser iniciada, então o botão a ser mostrado deve ser o de pausa
    playOrPauseCheck(false);
    //Chama api para iniciar a música
    callApi("PUT", PLAY + "?device_id=" + deviceId(), JSON.stringify(body), handleApiResponse);
}

//Pausa a música
function pauseMusic(){
    playOrPauseCheck(true);
    callApi("PUT", PAUSE + "?device_id=" + deviceId(), null, handleApiResponse);
}

//Próximo
function next(){
    callApi("POST", NEXT + "?device_id=" + deviceId(), null, handleApiResponse);
    currentlyPlaying();
}

//Anterior
function previous(){
    callApi("POST", PREVIOUS + "?device_id=" + deviceId(), null, handleApiResponse);
    currentlyPlaying();
}

//Em ordem misturada
function shuffle(){
    callApi( "PUT", SHUFFLE + "?state=true&device_id=" + deviceId(), null, handleApiResponse );
    currentlyPlaying();
    play(); 
}

//Rotina para tratar dos status das apis
function handleApiResponse(){
    if ( this.status == 200){
        console.log(this.responseText);
        setTimeout(currentlyPlaying, 2000);
    }
    else if ( this.status == 204 ){
        setTimeout(currentlyPlaying, 2000);
    }
    else if ( this.status == 401 ){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }    
}

//Captura a música que esteja tocando, mesmo em outro dispositivo
function currentlyPlaying(){
    callApi( "GET", PLAYER + "?market=US", null, handleCurrentlyPlayingResponse );
}

//Preenche as info da música atual
function handleCurrentlyPlayingResponse(){
    if ( this.status == 200 ){
        var data = JSON.parse(this.responseText);
        console.log(data);
        if ( data.item != null ){
            //Mostra a imagem da música, nome e cantor dela
            document.getElementById("albumImage").src = data.item.album.images[0].url;
            document.getElementById("trackTitle").innerHTML = data.item.name + " - " + data.item.artists[0].name;
        }

        if ( data.device != null ){
            // select device
            currentDevice = data.device.id;
            document.getElementById('devices').value=currentDevice;
        }

        if ( data.context != null ){
            // select playlist
            currentPlaylist = data.context.uri;
            currentPlaylist = currentPlaylist.substring( currentPlaylist.lastIndexOf(":") + 1,  currentPlaylist.length );
            document.getElementById('playlists').value=currentPlaylist;
        }
    }
    else if ( this.status == 204 ){

    }
    else if ( this.status == 401 ){
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

