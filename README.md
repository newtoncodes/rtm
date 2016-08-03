# rtm

Socket.io extension for invoking and emitting with callback.


## Installation

`npm install --save rtm`

The UMD build is in the dist directory.


## Description

Socket.io is a perfect library for what it's made for. We don't want to replace it, in fact, we just add 3 new methods to the socket both on the client and the server: `invoke`, `emitSafe` and `ping`.

**`invoke(method: string, data?: Object, callback: function(error:Object|null, param1?, ...param2?))`** 

Call a handler on the other side and wait for the callback (usually receiving some data).

**`emitSafe(event: string, param1, ...param2?: Object, callback: function(error:Object|null))`** 

Just like normal emit, but provided with a callback. The callback is called when the client receives the message.

**`ping(callback: function(error:Object|null, milliseconds))`** 

Ping the server and get the time it took to send and receive the data.


### Usage

Everything is perfectly shown in the examples folder. The client.js script can be run both on the client and the server.

The example below is more advanced because it is supposed to be used for bigger implementations with more than one method. If you don't need to extend you don't have to. You can just use RTMSocket from the rtm package just the same, just pass the handlers to it as a parameter.

~~~js
'use strict';

const RTMSocket = require('rtm');

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

const io = require('socket.io-client');
let client = ClientSocket.wrap(io('http://localhost', {reconnectionAttempts: 2}));

client.on('connect', () => {
    client.on('testEvent', (foo, bar) => console.log('Server sends testEvent:', foo, bar));
    client.once('disconnect_for_good', () => console.log('Connection closed.'));
    
    client.getServerTime();
    client.ping((error, time) => console.log('Ping result:', error, time));
    client.emitSafe('testEvent', 'foo', 'bar', error => console.log('Emitted: testEvent'));
});

~~~