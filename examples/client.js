'use strict';

const SocketIO = require('socket.io-client');
const ClientSocket = require('./ClientSocket.js');

let client = ClientSocket.wrap(SocketIO('http://localhost', {reconnectionAttempts: 2}));


client.on('connect', (error) => {
    console.log('Connection result:', error || null);

    client.ping((error, time) => {
        console.log('Ping result:', error, time);
    });

    client.emitSafe('testEvent', 'foo', 'bar', error => console.log('Emitted: testEvent'));

    client.invoke('test', {a: 1, b: 2}, (error, result) => {
        console.log('Invoke test result:', error, result);
    });

    client.invoke('testError', {a: 1, b: 2}, (error, result) => {
        console.log('Invoke testError result:', error, result);
    });

    let len = 10;
    client.invoke('sendData', {text: genText(len)}, () => console.log('Invoked sendData.'));

    let int1 = setInterval(client.pingServer.bind(client), 5000);
    let int2 = setInterval(client.getServerTime.bind(client), 3000);
    let int3 = setInterval(function () {
        client.emitSafe('test-notification', Date.now(), Math.random(), () => console.log('Emitted: test-notification.'));
    }, 3000);


    client.once('disconnect_for_good', function () {
        console.log('Connection closed.');

        clearInterval(int1);
        clearInterval(int2);
        clearInterval(int3);
    });
});


client.on('test-notification', (time, random) => {
    console.log('Server sends notification.', time, random);
});


function genText(len) {
    let count = Math.ceil(len / 10);
    let txt = '';
    for (let i = 0; i < count; i ++) txt += 'Hjjakjhhggf';
    return txt;
}