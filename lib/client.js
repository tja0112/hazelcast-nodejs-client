var net = require('net');
var layouts = require('./layouts');
var Q = require("q");
var codec = require("./codec");
var AtomicLongProxy = require("./AtomicLongProxy");

var HazelcastClient = function (options) {
    var host = options.host;
    var port = options.port;
    var username = options.username;
    var password = options.password;
    var self = this;
    this.correlationCounter = 0;
    this.pendingRequests = {};

    var ready = Q.defer();

    this.connection = net.connect({"host": host, "port": port}, function () {
        console.log('Connection established');

        // Send the protocol version
        var buffer = new Buffer(3);
        buffer.write("CB2");
        self.connection.write(buffer);

        // Send auth message
        self.authenticate(username, password).then(function () {
            console.log("Authentication successful");
            ready.resolve(self);
        });
    });

    this.connection.on('data', function (buffer) {
        var response = codec.decodePayload(buffer);
        var promise = self.pendingRequests[response.correlationId];
        promise.resolve(response.data);
    });


    this.connection.on('end', function () {
        console.log('Connection closed');
    });

    return ready.promise;
};

HazelcastClient.prototype.authenticate = function (username, password) {
    return this.invokeOperation(layouts.operations.AUTH, {
        "username": username,
        "password": password,
        "uuid": null,
        "ownerUuid": null,
        "isOwnerConnection": true,
        "clientType": "node",
        "serializationVersion": 1
    });
};

HazelcastClient.prototype.invokeOperation = function (operation, parameters) {
    var correlationId = this.correlationCounter++;
    var buffer = codec.encodePayload(operation, parameters, correlationId);

    this.connection.write(buffer);

    var deferred = Q.defer();
    this.pendingRequests[correlationId] = deferred;

    return deferred.promise;
};

HazelcastClient.prototype.getAtomicLong = function (name) {
    return new AtomicLongProxy(this, name);
};

module.exports = {
    "create": function (options) {
        return new HazelcastClient(options);
    }
};

