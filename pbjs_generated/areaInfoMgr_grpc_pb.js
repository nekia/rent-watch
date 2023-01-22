// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Protocol Buffersのバージョンを指定
'use strict';
var grpc = require('@grpc/grpc-js');
var areaInfoMgr_pb = require('./areaInfoMgr_pb.js');

function serialize_areaInfoMgr_GetRankRequest(arg) {
  if (!(arg instanceof areaInfoMgr_pb.GetRankRequest)) {
    throw new Error('Expected argument of type areaInfoMgr.GetRankRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_areaInfoMgr_GetRankRequest(buffer_arg) {
  return areaInfoMgr_pb.GetRankRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_areaInfoMgr_GetRankResponse(arg) {
  if (!(arg instanceof areaInfoMgr_pb.GetRankResponse)) {
    throw new Error('Expected argument of type areaInfoMgr.GetRankResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_areaInfoMgr_GetRankResponse(buffer_arg) {
  return areaInfoMgr_pb.GetRankResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// サービスを定義
var areaInfoMgrService = exports.areaInfoMgrService = {
  getRank: {
    path: '/areaInfoMgr.areaInfoMgr/GetRank',
    requestStream: false,
    responseStream: false,
    requestType: areaInfoMgr_pb.GetRankRequest,
    responseType: areaInfoMgr_pb.GetRankResponse,
    requestSerialize: serialize_areaInfoMgr_GetRankRequest,
    requestDeserialize: deserialize_areaInfoMgr_GetRankRequest,
    responseSerialize: serialize_areaInfoMgr_GetRankResponse,
    responseDeserialize: deserialize_areaInfoMgr_GetRankResponse,
  },
};

exports.areaInfoMgrClient = grpc.makeGenericClientConstructor(areaInfoMgrService);
