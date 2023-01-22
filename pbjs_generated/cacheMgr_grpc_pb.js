// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Protocol Buffersのバージョンを指定
'use strict';
var grpc = require('@grpc/grpc-js');
var cacheMgr_pb = require('./cacheMgr_pb.js');
var roomdetail_pb = require('./roomdetail_pb.js');

function serialize_cacheMgr_AddCacheRequest(arg) {
  if (!(arg instanceof cacheMgr_pb.AddCacheRequest)) {
    throw new Error('Expected argument of type cacheMgr.AddCacheRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cacheMgr_AddCacheRequest(buffer_arg) {
  return cacheMgr_pb.AddCacheRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cacheMgr_AddCacheResponse(arg) {
  if (!(arg instanceof cacheMgr_pb.AddCacheResponse)) {
    throw new Error('Expected argument of type cacheMgr.AddCacheResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cacheMgr_AddCacheResponse(buffer_arg) {
  return cacheMgr_pb.AddCacheResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cacheMgr_CheckCacheByDetailRequest(arg) {
  if (!(arg instanceof cacheMgr_pb.CheckCacheByDetailRequest)) {
    throw new Error('Expected argument of type cacheMgr.CheckCacheByDetailRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cacheMgr_CheckCacheByDetailRequest(buffer_arg) {
  return cacheMgr_pb.CheckCacheByDetailRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cacheMgr_CheckCacheByDetailResponse(arg) {
  if (!(arg instanceof cacheMgr_pb.CheckCacheByDetailResponse)) {
    throw new Error('Expected argument of type cacheMgr.CheckCacheByDetailResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cacheMgr_CheckCacheByDetailResponse(buffer_arg) {
  return cacheMgr_pb.CheckCacheByDetailResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cacheMgr_CheckCacheByUrlRequest(arg) {
  if (!(arg instanceof cacheMgr_pb.CheckCacheByUrlRequest)) {
    throw new Error('Expected argument of type cacheMgr.CheckCacheByUrlRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cacheMgr_CheckCacheByUrlRequest(buffer_arg) {
  return cacheMgr_pb.CheckCacheByUrlRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_cacheMgr_CheckCacheByUrlResponse(arg) {
  if (!(arg instanceof cacheMgr_pb.CheckCacheByUrlResponse)) {
    throw new Error('Expected argument of type cacheMgr.CheckCacheByUrlResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_cacheMgr_CheckCacheByUrlResponse(buffer_arg) {
  return cacheMgr_pb.CheckCacheByUrlResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// サービスを定義
var CacheMgrService = exports.CacheMgrService = {
  // 引数の型：HelloRequestメッセージ
// 戻り値の型：HelloReplyメッセージ
checkCacheByUrl: {
    path: '/cacheMgr.CacheMgr/CheckCacheByUrl',
    requestStream: false,
    responseStream: false,
    requestType: cacheMgr_pb.CheckCacheByUrlRequest,
    responseType: cacheMgr_pb.CheckCacheByUrlResponse,
    requestSerialize: serialize_cacheMgr_CheckCacheByUrlRequest,
    requestDeserialize: deserialize_cacheMgr_CheckCacheByUrlRequest,
    responseSerialize: serialize_cacheMgr_CheckCacheByUrlResponse,
    responseDeserialize: deserialize_cacheMgr_CheckCacheByUrlResponse,
  },
  checkCacheByDetail: {
    path: '/cacheMgr.CacheMgr/CheckCacheByDetail',
    requestStream: false,
    responseStream: false,
    requestType: cacheMgr_pb.CheckCacheByDetailRequest,
    responseType: cacheMgr_pb.CheckCacheByDetailResponse,
    requestSerialize: serialize_cacheMgr_CheckCacheByDetailRequest,
    requestDeserialize: deserialize_cacheMgr_CheckCacheByDetailRequest,
    responseSerialize: serialize_cacheMgr_CheckCacheByDetailResponse,
    responseDeserialize: deserialize_cacheMgr_CheckCacheByDetailResponse,
  },
  addCache: {
    path: '/cacheMgr.CacheMgr/AddCache',
    requestStream: false,
    responseStream: false,
    requestType: cacheMgr_pb.AddCacheRequest,
    responseType: cacheMgr_pb.AddCacheResponse,
    requestSerialize: serialize_cacheMgr_AddCacheRequest,
    requestDeserialize: deserialize_cacheMgr_AddCacheRequest,
    responseSerialize: serialize_cacheMgr_AddCacheResponse,
    responseDeserialize: deserialize_cacheMgr_AddCacheResponse,
  },
};

exports.CacheMgrClient = grpc.makeGenericClientConstructor(CacheMgrService);
