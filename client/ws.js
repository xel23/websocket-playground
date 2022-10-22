const wsConnection = new WebSocket("ws://localhost:9124");
wsConnection.onopen = function() {
    console.log('Connected');
};

wsConnection.onclose = function(event) {
    if (event.wasClean) {
        console.log('Connected was closed clean');
    } else {
        console.log('Connection refused');
    }
    console.log('Code: ' + event.code + ' reason: ' + event.reason);
};

wsConnection.onerror = function(error) {
    console.log('Error', error.message);
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
