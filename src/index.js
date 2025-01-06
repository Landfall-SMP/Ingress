import 'dotenv/config';
import {createServer} from 'node:net';
import {readFileSync} from 'node:fs';
import {log, formatAddress} from './utils.js';
import {ByteBuf, readHandshake, writeStringPacket, PACKET_PONG} from './mc-protocol.js';
import { playerCountManager } from './playerCount.js';

const HANDSHAKE_TIMEOUT = 2000; // ms
const PROTOCOL_VERSION = parseInt(process.env.PROTOCOL_VERSION) || 763;
const PROTOCOL_NAME = process.env.PROTOCOL_NAME || `1.20.1`;

function main() {
    const server = createServer();

    // Add server lifecycle logging
    server.on('listening', () => {
        const {address, port} = server.address();
        log(`Listening on ${formatAddress(address)}:${port}`);
    });
    server.on('error', (err) => {
        log('Server Error:', err);
    });

    // Add socket connection handler
    server.on('connection', handleSocket);

    // Start listening
    const listenOpts = {
        host: process.env.LISTEN_HOST || undefined,
        port: parseInt(process.env.LISTEN_PORT) || 25565,
        backlog: parseInt(process.env.LISTEN_BACKLOG) || undefined,
    };
    const listenErrorHandler = () => process.exit(1);
    server.on('error', listenErrorHandler);
    server.listen(listenOpts, () => server.off('error', listenErrorHandler));
}

/**
 * Handles a socket connection.
 *
 * @param {net.Socket} socket - The client socket.
 */
function handleSocket(socket) {
    const name = `[${formatAddress(socket.remoteAddress, false)}]:${socket.remotePort}`;

    // Add socket lifecycle logging
    log(`${name} connected`);
    let answered = false;
    let sockerErr = undefined;
    socket.on('error', (err) => {
        if (!sockerErr) {
            sockerErr = err;
        }
    });
    socket.on('close', () => {
        if (sockerErr) {
            log(`${name} disconnected with error: ${sockerErr.message}`);
        } else if (!answered) {
            log(`${name} disconnected before receiving response`);
        } else {
            log(`${name} disconnected successfully`);
        }
    });

    // Ensure that the socket is destroyed immediately on error
    socket.on('error', () => socket.destroy());

    // Set a strict timeout for the handshake
    const timeoutTask = setTimeout(() => socket.destroy(new Error('Timeout')), HANDSHAKE_TIMEOUT);
    socket.on('close', () => clearTimeout(timeoutTask));

    // Add data handler
    const buf = new ByteBuf();
    socket.on('data', async (data) => {
        if (socket.readyState !== 'open') {
            return;
        }
        if (answered) {
            return;
        }

        // Read the handshake
        buf.append(data);
        buf.resetOffset();
        const handshake = readHandshake(buf);
        if (handshake === undefined) {
            return;
        }
        if (handshake === false) {
            socket.destroy(new Error('Illegal handshake'));
            return;
        }

        log(`${name} sent handshake: ${JSON.stringify(handshake)}`);

        // Respond and close the socket
        answered = true;
        if (handshake.state === 2) {
            socket.end(getKickPacket());
        } else {
            socket.write(await getServerListPacket());
            socket.end(PACKET_PONG);
        }
    });
}

function parseChatComponent(str) {
    if (str.charAt(0) === '{') {
        try {
            return JSON.parse(str);
        } catch (ignored) {}
    }
    return {text: str};
}

function readFavicon(strOrPath) {
    if (!strOrPath) {
        return undefined;
    }

    if (strOrPath.startsWith('data:')) {
        return strOrPath;
    }

    try {
        const data = readFileSync(strOrPath, {encoding: 'base64'});
        return `data:image/png;base64,${data}`;
    } catch (err) {
        log(`Cannot read favicon: ${err.message}`);
        return undefined;
    }
}

const getKickPacket = (() => {
    const packet = writeStringPacket(
        0,
        JSON.stringify(parseChatComponent(process.env.KICK_MESSAGE || '§cNot available'))
    );
    return () => packet;
})();

const getServerListPacket = (() => {
    return async () => {
        let onlinePlayers = 0;
        
        // Check if a reflected server is specified
        if (process.env.REFLECTED_SERVER) {
            try {
                onlinePlayers = await playerCountManager.fetchPlayerCount(process.env.REFLECTED_SERVER);
            } catch (error) {
                log('Failed to fetch player count:', error);
                onlinePlayers = 0;
            }
        }

        return writeStringPacket(
            0,
            JSON.stringify({
                version: {
                    name: PROTOCOL_NAME,
                    protocol: PROTOCOL_VERSION,
                },
                players: {
                    max: parseInt(process.env.MAX_PLAYERS) || 100,
                    online: onlinePlayers,
                    sample: [],
                },
                description: parseChatComponent(process.env.MOTD || '§eHello World!'),
                favicon: readFavicon(process.env.FAVICON),
            })
        );
    };
})();

main();
