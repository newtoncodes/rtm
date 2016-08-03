'use strict';

const RTMSocket = require('../');


class ClientSocket extends RTMSocket {
    constructor(socket) {
        super(socket);

        this._handlers = {
            getTime: (data, callback) => {
                console.log('Server invoked getTime');
                callback(null, Date.now());
            },

            testError: (data, callback) => {
                console.log('Server invoked testError');
                callback(new Error('Just a test error.'));
            }
        };
    }

    getServerTime() {
        this.invoke('getTime', null, (error, time) => {
            console.log('Server time result:', error, time);
        });
    }

    pingServer() {
        this.ping(function (error, result) {
            console.log('Server ping result:', error, result);
        });
    }
}


module.exports = ClientSocket;