var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8000;

var keys = require('./keys.json'); //load account keys from json file

server.listen(port);

var azure = require('azure-storage');
console.log('starting datastreamer');

// We are making two storages for "slow" (less than 1Hz updates) and
// "rapid" data, so that if the quota for rapid data gets full
// it doesn't affect the other data.

// Azure Table Storage settings
var accountName = 'ehd2016';
var tableSvc = azure.createTableService(accountName,keys.accountKey);
tableSvc.busy = false;

//second storage for storing rapid data
var accountNameRapid = 'ehd2016v2';
var tableSvcRapid = azure.createTableService(accountNameRapid, keys.accountKeyRapid);
tableSvcRapid.busy = false;

io.on('connection', function(socket) {
  console.log('new connection');
  socket.emit('connection', 'hello');
  socket.on('subscribe', function(room) {
    socket.join(room);
  });
  socket.on('data', function(data) {
    if(data && data.data && data.room && data.id && data.secret === keys.secret) {
      delete data.secret;
      io.to(data.room).emit('data', data);

      //store data in azure:
      var tableStorage = data.rapid ? tableSvc : tableSvcRapid;
      var now = new Date();
      var entity = {
        PartitionKey: {'_': data.id},
        RowKey: {'_': now.getTime() + ''}
      }
      for (key in data.data) {
        entity[key] = {'_': data.data[key]};
      }
      if(!tableStorage.batch) tableStorage.batch = new azure.TableBatch();
      if(tableStorage.batch.size() < 100) tableStorage.batch.insertOrReplaceEntity(entity);
      if(!tableStorage.busy) {
        tableStorage.busy = true;
        tableStorage.createTableIfNotExists(data.room, function(error, result, response){
          if(!error) {
            // Table exists or created
            // Creating a new item to be stored in Azure Storage
            var batch = tableStorage.batch;
            tableStorage.batch = undefined;
            tableStorage.executeBatch(data.room, batch, function(error, result, response) {
              tableStorage.busy = false;
              if(!error){
                // Entity inserted
                console.log('Inserted');
              }
              else {
                console.log(error);
                for(var i=0; i<batch.operations.length; i++) {
                console.log(batch.operations[i].entity);
                }
              }
            });
            /*
            tableStorage.insertEntity(data.room, entity, function (error, result, response) {
              tableStorage.busy = false;
              if(!error){
                // Entity inserted
                console.log('Inserted')
              }
              else {
                console.log(error);
              }
            });
            */
          }
          else {
            console.log(error);
          }
        });
      }
    }
  });
});
