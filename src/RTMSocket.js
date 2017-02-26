'use strict';

const Emitters = {
    server: require('events').EventEmitter,
    client: require('component-emitter')
};

const RESERVED = ['send', 'emit', 'to', 'in', 'join', 'leave', 'leaveAll', 'disconnect'];


class RTMSocket {
    /**
     * Wrap existing socket.
     *
     * @param {Object} socket
     * @param {Object} [handlers]
     * @return {RTMSocket}
     */
    static wrap(socket, handlers) {
        new this(socket, handlers);
        return socket;
    }

    /**
     * Constructor.
     *
     * @param {Object} socket
     * @param {Object} [handlers]
     */
    constructor(socket, handlers = null) {
        this._handlers = handlers || this._handlers || {};
        this._callbacks = {};
        this._callbackId = 1;
        this._bound = {};

        this._isServer = (socket.__proto__ && socket.__proto__.__proto__ && socket.__proto__.__proto__.constructor === Emitters.server);

        this._invokeHandler = this._invokeHandler.bind(this);
        this._disconnectHandler = this._disconnectHandler.bind(this);
        this._reconnectFailedHandler = this._reconnectFailedHandler.bind(this);

        this._socket = socket;

        this._socket.rtm = this;

        let functions = [];

        let proto = Object.getPrototypeOf(this);
        while (proto && proto !== Object.prototype && proto !== Function.prototype) {
            functions = functions.concat(Object.getOwnPropertyNames(proto).map(prop => {
                return {name: prop, def: Object.getOwnPropertyDescriptor(proto, prop)};
            }));

            proto = Object.getPrototypeOf(proto);
        }

        functions = functions.filter(({name, def}) => {
            if (name[0] === '_' || RESERVED.indexOf(name) !== -1) return false;

            let getter = def.get;
            let setter = def.set;
            let value = def.value;

            return (
                (typeof getter === 'function') ||
                (typeof setter === 'function') ||
                (typeof value === 'function')
            );
        });

        functions.forEach(({name, def}) => {
            this._bound[name] = true;

            if (def.get && typeof def.get === 'function') def.get = def.get.bind(this);
            if (def.set && typeof def.set === 'function') def.set = def.set.bind(this);
            if (def.value && typeof def.value === 'function') def.value = def.value.bind(this);

            Object.defineProperty(this._socket, name, def);
        });

        this._socket.on('_____rtm_invoke', this._invokeHandler);
        this._socket.once('disconnect', this._disconnectHandler);
        if (!this._isServer) this._socket.once('reconnect_failed', this._reconnectFailedHandler);
    }

    /**
     * Invoke remote method
     *
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
     * Sends a `message` event.
     *
     * @return {RTMSocket} self
     * @api public
     */
    send() {
        // Dummy. Only for IntelliSense.
        return this;
    }

    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @param {String} event name
     * @param {...*} [param]
     * @return {RTMSocket} self
     * @api public
     */
    emit(event, param) {
        // Dummy. Only for IntelliSense.
        return this;
    }

    /**
     * Targets a room when broadcasting.
     *
     * @param {String} name
     * @return {RTMSocket} self
     * @api public
     */
    to(name) {
        // Dummy. Only for IntelliSense.
        return this;
    }

    /**
     * Targets a room when broadcasting.
     *
     * @param {String} name
     * @return {RTMSocket} self
     * @api public
     */
    in(name) {
        // Dummy. Only for IntelliSense.
        return this;
    }

    /**
     * Joins a room.
     *
     * @param {String} room
     * @param {Function} [fn] callback
     * @return {RTMSocket} self
     * @api private
     */
    join(room, fn) {
        // Dummy. Only for IntelliSense.
        return this;
    }

    /**
     * Leaves a room.
     *
     * @param {String} room
     * @param {Function} [fn] callback
     * @return {RTMSocket} self
     * @api private
     */
    leave(room, fn) {
        // Dummy. Only for IntelliSense.
        return this;
    }

    /**
     * Leave all rooms.
     *
     * @api private
     */
    leaveAll() {
        // Dummy. Only for IntelliSense.
    }

    /**
     * Disconnects this client.
     *
     * @param {Boolean} close if `true`, closes the underlying connection
     * @return {RTMSocket} self
     * @api public
     */
    disconnect(close) {
        // Dummy. Only for IntelliSense.
    }

    /**
     * Emit local event (don't send via socket.io).
     *
     * @param {string} event
     * @param {...*} [params]
     */
    emitLocal(event, params) {
        this._emit(arguments);
    }

    /**
     * Emit with callback.
     *
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
     * Ping and get time.
     *
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
        id = parseInt(id);
        if (isNaN(id)) return;

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

        if (!this._handlers.hasOwnProperty(method) || (typeof this._handlers[method] !== 'function')) {
            callback([new Error('There is no method: ' + method)]);
            return;
        }

        this._handlers[method].call(this, data || {}, (...params) => callback(params));
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
            Object.keys(this._bound).forEach(fn => {
                try {
                    Object.defineProperty(this._socket, fn, {value: () => {}});
                } catch (e) {}
            });
            this._socket.rtm = null;

            this._emit(['disconnect_for_good']);

            this._socket = null;
        }

        Object.keys(this._callbacks).forEach(id => {
            this._pullCallback(id)(new Error('Connection closed unexpectedly.'));
        });
    }
}


module.exports = RTMSocket;