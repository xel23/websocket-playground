import express from 'express';
import {mainRouter} from './routes/main.routes.js';

export const app = express();

app.use('/websocket', mainRouter);

const PORT = 9123;
app.listen(PORT, '127.0.0.1', () => {
    console.info(`App has been started on port: ${PORT}`);
});
