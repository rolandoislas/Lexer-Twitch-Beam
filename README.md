# Lexer - Twitch vs Beam

[Lexer] fork controlled by Twitch and Mixer chats

# Running

The entry point is `node ./src/index.js`.

## Environment Variables

### PORT

Port used to host webserver/socket

### AUTH

Control panel authentication

### TWITCH_AUTH

Twitch OAuth Token

### TWITCH_USERNAME

Twitch username

### BEAM_AUTH

Beam OAuth Token

### BEAM_USERNAME

Beam user name

### REDIS_URL

Redis connect URL

### GAME_DAEMON

If `true`, the game background task will start without the need for the
 control panel to be open.