import express, {request} from 'express';
import {mainRouter} from './routes/main.routes.js';
import { WebSocketServer } from 'ws';
import TURN from 'node-turn';

const turnServer = new TURN({
    listeningPort: 7788,
    authMech: 'long-term',
    credentials: {
        webrtc: 'turnserver'
    }
});

turnServer.start();

export const app = express();

app.use('/websocket', mainRouter);

console.log(app);
const webSocketServer = new WebSocketServer({
    port: 9124
});

const connections = {};
let currentId = 0;

function sendToOneUser(target, msgString) {
    connections[target]?.send(msgString);
}

webSocketServer.on('connection', connection => {
    connections[currentId] = connection;
    connection.cliendId = currentId;
    currentId++;

    Object.keys(connections).forEach(id => {
        connections[id].send(JSON.stringify({
            type: 'id',
            id: connection.cliendId
        }));
    });

    connection.on('message', function(message) {
        const msg = JSON.parse(message);
        if (msg.type === 'video-answer') {
            console.log("Received Message: " + message);
        }
        sendToOneUser(msg.target, message);
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
