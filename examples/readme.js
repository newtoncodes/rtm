'use strict';

const RTMSocket = require('../');

// First we extend for all sockets we will need.

class ServerSocket extends RTMSocket {
    constructor(socket) {
        super(socket);

        this._handlers = {
            getTime: (data, callback) => {
                console.log('Client invoked getTime.');
                callback(null, Date.now());
            }
        };
    }

    getClientTime() {
        this.invoke('getTime', null, (error, result) => {
            console.log('Client time result:', error, result);
        });
    }
}

class ClientSocket extends RTMSocket {
    constructor(socket) {
        super(socket);

        this._handlers = {
            getTime: (data, callback) => {
                console.log('Server invoked getTime.');
                callback(null, Date.now());
            }
        };
    }

    getServerTime() {
        this.invoke('getTime', null, (error, time) => {
            console.log('Server time result:', error, time);
        });
    }
}

// And now just wrap the client and the server sockets:

// Server code:

const io = require('socket.io');
let socket = io();
socket.listen(80);

socket.on('connection', (socket) => {
    console.log('Connection established.');

    socket = ServerSocket.wrap(socket);

    socket.on('testEvent', (foo, bar) => console.log('Client sends testEvent:', foo, bar));
    socket.once('disconnect_for_good', () => console.log('Connection closed.'));

    socket.getClientTime();
    client.ping((error, time) => console.log('Ping result:', error, time));
    socket.emitSafe('testEvent', 'foo', 'bar', error => console.log('Emitted: testEvent'));
});


// Client code:

const io2 = require('socket.io-client');
let client = ClientSocket.wrap(io2('http://localhost', {reconnectionAttempts: 2}));

client.on('connect', () => {
    client.on('testEvent', (foo, bar) => console.log('Server sends testEvent:', foo, bar));
    client.once('disconnect_for_good', () => console.log('Connection closed.'));

    client.getServerTime();
    client.ping((error, time) => console.log('Ping result:', error, time));
    client.emitSafe('testEvent', 'foo', 'bar', error => console.log('Emitted: testEvent'));
});
