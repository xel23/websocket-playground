import {Router} from 'express';
import crypto from "crypto";
const router = Router();

router.get(
    '/',
    (req, res) => {
        res.append('Upgrade', 'websocket');
        res.append('Connection', 'upgrade');

        const shasum = crypto.createHash('sha1');
        shasum.update(req.headers['sec-websocket-key'] + '778EAFA5-E914-47DA-95CA-C5AB0DC85B00');
        const secHeader = shasum.digest('base64');
        res.append('Sec-WebSocket-Accept', secHeader);

        return res.status(101);
    }
);

export {router as mainRouter};
