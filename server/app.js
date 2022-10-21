import express from 'express';
import {mainRouter} from './routes/main.routes.js';
import { WebSocketServer } from 'ws';

export const app = express();

app.use('/websocket', mainRouter);

console.log(app);
const webSocketServer = new WebSocketServer({
    port: 9124
});

webSocketServer.on('connection', ws => {
    ws.on('message', m => {
        const buffer = new Buffer(m);
        webSocketServer.clients.forEach(client => client.send(buffer.toString()));
    });

    ws.on("error", e => ws.send(e));
});

const PORT = 9123;
app.listen(PORT, '127.0.0.1', () => {
    console.info(`App has been started on port: ${PORT}`);
});
