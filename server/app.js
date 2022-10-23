import express, {request} from 'express';
import {mainRouter} from './routes/main.routes.js';
import { WebSocketServer } from 'ws';

export const app = express();

app.use('/websocket', mainRouter);

console.log(app);
const webSocketServer = new WebSocketServer({
    port: 9124
});

const connections = {};
let currentId = 0;

function sendToOneUser(target, msgString) {
    connections[target].send(msgString);
}

webSocketServer.on('connection', connection => {
    connections[currentId] = connection;
    connection.cliendId = currentId;
    currentId++;
    connection.send(JSON.stringify({
        type: 'id',
        id: connection.cliendId
    }));

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received Message: " + message);
            const msg = JSON.parse(message);
            sendToOneUser(msg.target, message);
        }
    });

    connection.on('close', (reason, description) => {
        delete connections[connection.cliendId];
        let logMessage = "Connection closed: " + connection.remoteAddress + " (" + reason;
        if (description !== null && description.length !== 0) {
            logMessage += ": " + description;
        }
        logMessage += ")";
        console.log(logMessage);
    });
});

const PORT = 9123;
app.listen(PORT, '127.0.0.1', () => {
    console.info(`App has been started on port: ${PORT}`);
});
