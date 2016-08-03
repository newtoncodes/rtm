'use strict';

const SocketIO = require('socket.io');
const ServerSocket = require('./ServerSocket.js');

let socket = SocketIO();

socket.on('connection', (socket) => {
    console.log('Connection established.');

    socket = ServerSocket.wrap(socket);

    socket.on('testEvent', (error) => {
        console.log('Client sends testEvent:', error);
    });

    socket.on('test-notification', (time, random) => {
        console.log('Client sends notification.', time, random);
    });

    socket.invoke('testError', (error, result) => {
        console.log('Invoke testError result:', error, result);
    });

    let int1 = setInterval(socket.pingClient.bind(socket, socket), 5000);
    let int2 = setInterval(socket.getClientTime.bind(socket, socket), 3000);
    let int3 = setInterval(() => {
        socket.emitSafe('test-notification', Date.now(), Math.random(), () => console.log('Emitted: test-notification'));
    }, 3000);


    socket.once('disconnect_for_good', function () {
        console.log('Connection closed.');

        clearInterval(int1);
        clearInterval(int2);
        clearInterval(int3);
    });
});

socket.listen(80);