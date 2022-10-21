const wsConnection = new WebSocket("ws://localhost:9124");
wsConnection.onopen = function() {
    console.log("Соединение установлено.");
};

wsConnection.onclose = function(event) {
    if (event.wasClean) {
        console.log('Соединение закрыто чисто');
    } else {
        console.log('Обрыв соединения'); // например, "убит" процесс сервера
    }
    console.log('Код: ' + event.code + ' причина: ' + event.reason);
};

wsConnection.onerror = function(error) {
    console.log("Ошибка " + error.message);
};

wsConnection.onmessage = async(event) => {
    const data = await new Response(event.data).json();
    console.log(data);
}

const wsSend = function(data) {
// readyState - true, если есть подключение
    if(!wsConnection.readyState){
        setTimeout(function (){
            wsSend(data);
        },100);
    } else {
        wsConnection.send(data);
    }
};


wsSend(JSON.stringify({foo: 'bar'}));
