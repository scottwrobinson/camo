'use strict';

const assertConnected = db => {
  if (db === null || db === undefined) {
    throw new Error('You must first call \'connect\' before loading/saving documents.');
  }
};

exports.getClient = () => {
  const client = global.CLIENT;
  assertConnected(client);
  return client;
};
