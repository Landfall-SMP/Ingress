# Fake Minecraft Server

This is a fake Minecraft server that allows us to post on server lists despite being modded. It will match the version of the player attempting to connect, and kick them with a message to join our Discord.

In efforts to respect server listing sites and abide by their terms of service, Landfall has also implemented a system that mirrors the real playercount of the main modded server.

## Usage

To start this server, simply run:

```shell
npm ci
npm run start
```

## Configuration

The configuration is defined via environment variables:

| Variable           | Description                                                                                                 | Default           |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------- |
| `LISTEN_HOST`      | The hostname or IP address to listen on                                                                     | `::`              |
| `LISTEN_PORT`      | The port number to listen on                                                                                | `25565`           |
| `LISTEN_BACKLOG`   | The maximum number of queued pending connections                                                            | -                 |
| `KICK_MESSAGE`     | The message to send when a player try to join                                                               | `§cNot available` |
| `MOTD`             | The message displayed in the server list                                                                    | `§eHello World!`  |
| `FAVICON`          | The favicon displayed in the server list (path to a PNG file, or a string like `data:image/png;base64,XXX`) | -                 |
| `MAX_PLAYERS`      | The number of slots displayed in the server list                                                            | `0`               |
| `REFLECTED_SERVER`   | The server to reflect player count from (in hostname:port format)                                         | -                 |
| `PROTOCOL_NAME`    | The protocol name reported in the server list                                                               | `1.20.1`          |
| `PROTOCOL_VERSION` | The protocol version reported in the server list                                                            | `0`               |

To set these environment variables, you can either export them in your shell or
create a `.env` file in the root of the project. Here's an example:

```
LISTEN_PORT=25566
KICK_MESSAGE="§b§lLandfall SMP\n\n§fJoin our Discord to gain access and join our rich canon!\n§8http://§7§ldiscord.landfall.world\n\n§r§7§oWe can't wait to meet you!"
MOTD="§9§lLandfall SMP\n§8§l» §7Ingress §8§l»"
PROTOCOL_NAME="§cIngress"
REFLECTED_SERVER="play.landfall.world:25565"
```
