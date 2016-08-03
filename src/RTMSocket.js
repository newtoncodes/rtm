'use strict';

const Emitters = {
    server: require('events').EventEmitter,
    client: require('component-emitter')
};


class RTMSocket {
    /**
     * @param {Object} socket
     * @param {Object} [handlers]
     * @return {RTMSocket}
     */
    static wrap(socket, handlers) {
        new this(socket, handlers);
        return socket;
    }

    /**
     * @param {Object} socket
     * @param {Object} [handlers]
     */
    constructor(socket, handlers = null) {
        this._handlers = handlers || this._handlers || {};
        this._callbacks = {};
        this._callbackId = 1;
        this._binded = {};

        this._isServer = (socket.__proto__ && socket.__proto__.__proto__ && socket.__proto__.__proto__.constructor === Emitters.server);

        this._invokeHandler = this._invokeHandler.bind(this);
        this._disconnectHandler = this._disconnectHandler.bind(this);
        this._reconnectFailedHandler = this._reconnectFailedHandler.bind(this);

        this._socket = socket;

        this._socket.rtm = this;

        let functions = [];

        let proto = Object.getPrototypeOf(this);
        while (proto && proto !== Object.prototype && proto !== Function.prototype) {
            functions = functions.concat(Object.getOwnPropertyNames(proto));
            proto = Object.getPrototypeOf(proto);
        }

        functions = functions.filter(fn => typeof this[fn] === 'function' && fn[0] !== '_' && fn !== 'constructor');
        functions.forEach(fn => {
            this._socket[fn] = this[fn].bind(this);
            this._binded[fn] = true;
        });

        this._socket.on('_____rtm_invoke', this._invokeHandler);
        this._socket.once('disconnect', this._disconnectHandler);
        if (!this._isServer) this._socket.once('reconnect_failed', this._reconnectFailedHandler);
    }

    /**
     * @param {string} method
     * @param {Object} [data]
     * @param {function} callback
     */
    invoke(method, data, callback) {
        callback = arguments[arguments.length - 1];
        if (arguments.length === 2) callback = arguments[1];

        if (!method || typeof method !== 'string') {
            throw new Error('Please provide method name for invoke.');
        }

        if (typeof callback !== 'function') {
            throw new Error('Please provide a callback for invoke. If you don\'t need one just use the default emit.');
        }

        let id = this._pushCallback(callback);
        this._socket && this._socket.emit('_____rtm_invoke', id, method, data);
    }

    /**
     * @param {string} event
     * @param {...*} [params]
     * @param {function} [callback]
     */
    emitSafe(event, params, callback) {
        callback = arguments[arguments.length - 1];
        if (arguments.length === 2) callback = arguments[1];

        if (!event || typeof event !== 'string') {
            throw new Error('Please provide event name for emitSafe.');
        }

        if (typeof callback !== 'function') {
            throw new Error('Please provide a callback for emitSafe. If you don\'t need one just use the default emit.');
        }

        params = [event];
        for (let i = 1, l = arguments.length - 1; i < l; i ++) params.push(arguments[i]);

        arguments[0] = '_____rtm_emitSafe';
        this.invoke('_____rtm_emitSafe', params, callback);
    }

    /**
     * @param {function} callback
     */
    ping(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Please provide a callback for ping.');
        }

        let start = Date.now();

        this.invoke('_____rtm_ping', null, (error, mid) => {
            if (error) return callback(error);
            callback(null, Date.now() - start);
        });
    }

    /**
     * @param {function} callback
     * @returns {number}
     * @private
     */
    _pushCallback(callback) {
        let id = this._callbackId ++;
        this._callbacks[id] = callback;

        return id;
    }

    /**
     * @param {int} id
     * @returns {function}
     * @private
     */
    _pullCallback(id) {
        if (!this._callbacks.hasOwnProperty(id)) return () => {};

        let cb = this._callbacks[id];
        delete this._callbacks[id];

        return cb;
    }

    /**
     * @param {Array} params
     * @private
     */
    _emit(params) {
        let emit = this._isServer ? Emitters.server.prototype.emit : Emitters.client.prototype.emit;
        emit.apply(this._socket, params);
    }

    /**
     * @param {number} id
     * @param {string} method
     * @param {Object} data
     * @private
     */
    _invokeHandler(id, method, data) {
        if (method === '_____rtm_invoke_cb') {
            this._pullCallback(id)(...data);
            return;
        }

        let callback = params => {
            if (params[0] && (params[0] instanceof Error)) {
                let error = {message: params[0].message};

                Object.getOwnPropertyNames(params[0]).forEach(key => error[key] = params[0][key]);

                delete error.stack;

                params[0] = error;
            }

            this._socket && this._socket.emit('_____rtm_invoke', id, '_____rtm_invoke_cb', params)
        };

        if (method === '_____rtm_emitSafe') {
            this._emit(data);
            callback([null]);
            return;
        }

        if (method === '_____rtm_ping') {
            callback([null, Date.now()]);
            return;
        }

        if (!this._handlers.hasOwnProperty(method)) {
            callback([new Error('There is no method: ' + method)]);
            return;
        }

        this._handlers[method].call(this, data, (...params) => callback(params));
    }

    /**
     * @private
     */
    _disconnectHandler() {
        if (this._socket.io && this._socket.io.reconnection()) return;
        this._destroy();
    }

    /**
     * @private
     */
    _reconnectFailedHandler() {
        this._destroy();
    }

    /**
     * @private
     */
    _destroy() {
        if (this._destroyed) return;

        this._destroyed = true;

        if (this._socket) {
            this._socket.off && this._socket.off('_____rtm_invoke', this._invokeHandler);
            Object.keys(this._binded).forEach(fn => this._socket[fn] = () => {});
            this._socket.rtm = null;

            this._emit(['disconnect_for_good']);

            this._socket = null;
        }
    }
}


module.exports = RTMSocket;