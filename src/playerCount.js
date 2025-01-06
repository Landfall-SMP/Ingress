import { Socket } from 'node:net';

class PlayerCountManager {
    constructor() {
        this.currentPlayerCount = 0;
        this.lastFetchTime = 0;
        this.fetchInterval = 5 * 60 * 1000; // 5 minutes
    }

    async fetchPlayerCount(serverString) {
        const now = Date.now();
        
        // Check if we need to fetch
        if (now - this.lastFetchTime < this.fetchInterval && this.currentPlayerCount !== undefined) {
            return this.currentPlayerCount;
        }

        // Parse server string
        const [host, port] = serverString.split(':');
        
        try {
            const count = await this._queryServer(host, parseInt(port));
            this.currentPlayerCount = count;
            this.lastFetchTime = now;
            return count;
        } catch (error) {
            console.error('Failed to fetch player count:', error);
            return this.currentPlayerCount; // Return last known count
        }
    }

    _queryServer(host, port) {
        return new Promise((resolve, reject) => {
            const socket = new Socket();
            
            const timeout = setTimeout(() => {
                socket.destroy();
                reject(new Error('Connection timeout'));
            }, 3000);

            socket.connect(port, host, () => {
                clearTimeout(timeout);
                socket.write(this._createHandshakePacket(host, port));
                socket.write(this._createStatusRequestPacket());
            });

            let responseData = Buffer.alloc(0);

            socket.on('data', (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);
                
                try {
                    const statusResponse = this._parseStatusResponse(responseData);
                    if (statusResponse) {
                        socket.destroy();
                        resolve(statusResponse.players.online);
                    }
                } catch (error) {
                    socket.destroy();
                    reject(error);
                }
            });

            socket.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    _createHandshakePacket(hostname, port) {
        const buf = Buffer.alloc(256);
        let offset = 0;

        // Packet Length (to be filled later)
        const lenOffset = offset;
        offset += this._writeVarInt(buf, offset, 0);

        // Packet ID
        offset += this._writeVarInt(buf, offset, 0);

        // Protocol Version
        offset += this._writeVarInt(buf, offset, 758);

        // Server Address
        offset += this._writeString(buf, offset, hostname);

        // Server Port
        buf.writeUInt16BE(port, offset);
        offset += 2;

        // Next State (1 = Status)
        offset += this._writeVarInt(buf, offset, 1);

        // Now write the actual packet length
        const packetLength = offset - lenOffset - this._getVarIntLength(0);
        this._writeVarInt(buf.slice(lenOffset), 0, packetLength);

        return buf.slice(0, offset);
    }

    _createStatusRequestPacket() {
        const buf = Buffer.alloc(5);
        let offset = 0;

        // Packet Length
        offset += this._writeVarInt(buf, offset, 1);

        // Packet ID for Status Request
        buf.writeUInt8(0, offset);

        return buf;
    }

    _parseStatusResponse(data) {
        try {
            const jsonStr = data.toString('utf8').match(/\{.*\}/)[0];
            return JSON.parse(jsonStr);
        } catch {
            return null;
        }
    }

    // Utility methods for VarInt encoding
    _writeVarInt(buf, offset, value) {
        let written = 0;
        while (true) {
            if ((value & ~0x7F) === 0) {
                buf.writeUInt8(value, offset + written);
                written++;
                break;
            }

            buf.writeUInt8((value & 0x7F) | 0x80, offset + written);
            written++;
            value >>>= 7;
        }
        return written;
    }

    _getVarIntLength(value) {
        let length = 0;
        do {
            length++;
            value >>>= 7;
        } while (value !== 0);
        return length;
    }

    _writeString(buf, offset, str) {
        const strBuffer = Buffer.from(str, 'utf8');
        offset += this._writeVarInt(buf, offset, strBuffer.length);
        strBuffer.copy(buf, offset);
        return strBuffer.length + this._getVarIntLength(strBuffer.length);
    }
}

export const playerCountManager = new PlayerCountManager();
