// source: roomdetail.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} reports error on implicit type usages.
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.EstateArea', null, global);
goog.exportSymbol('proto.FloorLevel', null, global);
goog.exportSymbol('proto.RoomDetail', null, global);
goog.exportSymbol('proto.RoomType', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.FloorLevel = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.FloorLevel, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.FloorLevel.displayName = 'proto.FloorLevel';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.RoomDetail = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.RoomDetail, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.RoomDetail.displayName = 'proto.RoomDetail';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.FloorLevel.prototype.toObject = function(opt_includeInstance) {
  return proto.FloorLevel.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.FloorLevel} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.FloorLevel.toObject = function(includeInstance, msg) {
  var f, obj = {
    floorlevel: jspb.Message.getFieldWithDefault(msg, 1, 0),
    floortoplevel: jspb.Message.getFieldWithDefault(msg, 2, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.FloorLevel}
 */
proto.FloorLevel.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.FloorLevel;
  return proto.FloorLevel.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.FloorLevel} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.FloorLevel}
 */
proto.FloorLevel.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setFloorlevel(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setFloortoplevel(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.FloorLevel.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.FloorLevel.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.FloorLevel} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.FloorLevel.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getFloorlevel();
  if (f !== 0) {
    writer.writeInt32(
      1,
      f
    );
  }
  f = message.getFloortoplevel();
  if (f !== 0) {
    writer.writeInt32(
      2,
      f
    );
  }
};


/**
 * optional int32 floorLevel = 1;
 * @return {number}
 */
proto.FloorLevel.prototype.getFloorlevel = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/**
 * @param {number} value
 * @return {!proto.FloorLevel} returns this
 */
proto.FloorLevel.prototype.setFloorlevel = function(value) {
  return jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional int32 floorTopLevel = 2;
 * @return {number}
 */
proto.FloorLevel.prototype.getFloortoplevel = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {number} value
 * @return {!proto.FloorLevel} returns this
 */
proto.FloorLevel.prototype.setFloortoplevel = function(value) {
  return jspb.Message.setProto3IntField(this, 2, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.RoomDetail.prototype.toObject = function(opt_includeInstance) {
  return proto.RoomDetail.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.RoomDetail} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RoomDetail.toObject = function(includeInstance, msg) {
  var f, obj = {
    address: jspb.Message.getFieldWithDefault(msg, 1, ""),
    price: jspb.Message.getFloatingPointFieldWithDefault(msg, 2, 0.0),
    size: jspb.Message.getFloatingPointFieldWithDefault(msg, 3, 0.0),
    floorlevel: (f = msg.getFloorlevel()) && proto.FloorLevel.toObject(includeInstance, f),
    location: jspb.Message.getFieldWithDefault(msg, 5, ""),
    builtyear: jspb.Message.getFieldWithDefault(msg, 6, 0),
    type: jspb.Message.getFieldWithDefault(msg, 7, 0),
    area: jspb.Message.getFieldWithDefault(msg, 8, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.RoomDetail}
 */
proto.RoomDetail.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.RoomDetail;
  return proto.RoomDetail.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.RoomDetail} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.RoomDetail}
 */
proto.RoomDetail.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setAddress(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readDouble());
      msg.setPrice(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readDouble());
      msg.setSize(value);
      break;
    case 4:
      var value = new proto.FloorLevel;
      reader.readMessage(value,proto.FloorLevel.deserializeBinaryFromReader);
      msg.setFloorlevel(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setLocation(value);
      break;
    case 6:
      var value = /** @type {number} */ (reader.readInt32());
      msg.setBuiltyear(value);
      break;
    case 7:
      var value = /** @type {!proto.RoomType} */ (reader.readEnum());
      msg.setType(value);
      break;
    case 8:
      var value = /** @type {!proto.EstateArea} */ (reader.readEnum());
      msg.setArea(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.RoomDetail.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.RoomDetail.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.RoomDetail} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.RoomDetail.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getAddress();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getPrice();
  if (f !== 0.0) {
    writer.writeDouble(
      2,
      f
    );
  }
  f = message.getSize();
  if (f !== 0.0) {
    writer.writeDouble(
      3,
      f
    );
  }
  f = message.getFloorlevel();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.FloorLevel.serializeBinaryToWriter
    );
  }
  f = message.getLocation();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = message.getBuiltyear();
  if (f !== 0) {
    writer.writeInt32(
      6,
      f
    );
  }
  f = message.getType();
  if (f !== 0.0) {
    writer.writeEnum(
      7,
      f
    );
  }
  f = message.getArea();
  if (f !== 0.0) {
    writer.writeEnum(
      8,
      f
    );
  }
};


/**
 * optional string address = 1;
 * @return {string}
 */
proto.RoomDetail.prototype.getAddress = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.setAddress = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional double price = 2;
 * @return {number}
 */
proto.RoomDetail.prototype.getPrice = function() {
  return /** @type {number} */ (jspb.Message.getFloatingPointFieldWithDefault(this, 2, 0.0));
};


/**
 * @param {number} value
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.setPrice = function(value) {
  return jspb.Message.setProto3FloatField(this, 2, value);
};


/**
 * optional double size = 3;
 * @return {number}
 */
proto.RoomDetail.prototype.getSize = function() {
  return /** @type {number} */ (jspb.Message.getFloatingPointFieldWithDefault(this, 3, 0.0));
};


/**
 * @param {number} value
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.setSize = function(value) {
  return jspb.Message.setProto3FloatField(this, 3, value);
};


/**
 * optional FloorLevel floorLevel = 4;
 * @return {?proto.FloorLevel}
 */
proto.RoomDetail.prototype.getFloorlevel = function() {
  return /** @type{?proto.FloorLevel} */ (
    jspb.Message.getWrapperField(this, proto.FloorLevel, 4));
};


/**
 * @param {?proto.FloorLevel|undefined} value
 * @return {!proto.RoomDetail} returns this
*/
proto.RoomDetail.prototype.setFloorlevel = function(value) {
  return jspb.Message.setWrapperField(this, 4, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.clearFloorlevel = function() {
  return this.setFloorlevel(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.RoomDetail.prototype.hasFloorlevel = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional string location = 5;
 * @return {string}
 */
proto.RoomDetail.prototype.getLocation = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/**
 * @param {string} value
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.setLocation = function(value) {
  return jspb.Message.setProto3StringField(this, 5, value);
};


/**
 * optional int32 builtYear = 6;
 * @return {number}
 */
proto.RoomDetail.prototype.getBuiltyear = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 6, 0));
};


/**
 * @param {number} value
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.setBuiltyear = function(value) {
  return jspb.Message.setProto3IntField(this, 6, value);
};


/**
 * optional RoomType type = 7;
 * @return {!proto.RoomType}
 */
proto.RoomDetail.prototype.getType = function() {
  return /** @type {!proto.RoomType} */ (jspb.Message.getFieldWithDefault(this, 7, 0));
};


/**
 * @param {!proto.RoomType} value
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.setType = function(value) {
  return jspb.Message.setProto3EnumField(this, 7, value);
};


/**
 * optional EstateArea area = 8;
 * @return {!proto.EstateArea}
 */
proto.RoomDetail.prototype.getArea = function() {
  return /** @type {!proto.EstateArea} */ (jspb.Message.getFieldWithDefault(this, 8, 0));
};


/**
 * @param {!proto.EstateArea} value
 * @return {!proto.RoomDetail} returns this
 */
proto.RoomDetail.prototype.setArea = function(value) {
  return jspb.Message.setProto3EnumField(this, 8, value);
};


/**
 * @enum {number}
 */
proto.RoomType = {
  RENT: 0,
  SALE: 1
};

/**
 * @enum {number}
 */
proto.EstateArea = {
  TKY: 0,
  NGY: 1
};

goog.object.extend(exports, proto);