'use strict';

const DatabaseClient = require('./client');

var clients = {};

class Clients {
    static register(type, client) {
        if (!DatabaseClient.prototype.isPrototypeOf(client.prototype))
            throw new TypeError(`Client must derive from 'DatabaseClient'`);
        clients[type] = client;
    }

    static unregister(type) {
        clients[type] = undefined;
    }

    static get(type) {
        if (!clients.hasOwnProperty(type))
            this.registerDefaultClients(type);
        return clients[type];
    }

    static registerDefaultClients(type) {
        switch (type) {
            case 'nedb':
                this.register(type, require('./nedbclient'));
                break;
            case 'mongodb':
                this.register(type, require('./mongoclient'));
                break;
        }
    }
}

exports.Clients = Clients;

exports.getClient = function() {
    const client = global.CLIENT;
    if (client === null || client === undefined)
        throw new Error('You must first call \'connect\' before loading/saving documents.');
    return client;
};
