'use strict';

const RTMSocket = require('../');


class ServerSocket extends RTMSocket {
    constructor(socket) {
        super(socket);

        this._handlers = {
            getTime: (data, callback) => {
                console.log('Client invoked getTime');
                callback(null, Date.now());
            },

            sendData: function ({text}, callback) {
                console.log('Client invoked sendData:', text.length);
                callback();
            },

            test: ({a, b}, callback) => {
                console.log('Client invoked test:', a, b);
                callback(null, a + b + 1);
            },

            testError: ({a, b}, callback) => {
                console.log('Client invoked testError:', a, b);
                callback(new Error('Just a test error.'));
            }
        };
    }

    pingClient() {
        this.ping((error, result) => {
            console.log('Client ping result:', error, result);
        });
    }

    getClientTime() {
        this.invoke('getTime', null, (error, result) => {
            console.log('Client time result:', error, result);
        });
    }
}


module.exports = ServerSocket;