"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tbs_4_24_tables = {
  "tb_user": "tb_user",
  "tb_user_detail": "tb_user_detail"
};

exports.tbs_4_24_columns = {
  "tb_user": {
    "uid": "uid",
    "name": "name"
  },
  "tb_user_detail": {
    "uid": "uid",
    "age": "age"
  }
};

exports.tbs_4_24_scopedColumns = {
  "tb_user": {
    "uid": "tb_user.uid",
    "name": "tb_user.name"
  },
  "tb_user_detail": {
    "uid": "tb_user_detail.uid",
    "age": "tb_user_detail.age"
  }
};

exports.tbs_4_24_aliasColumns = {
  "tb_user": {
    "uid": {
      "input": "tb_user.uid",
      "output": "tbUserUid"
    },
    "name": {
      "input": "tb_user.name",
      "output": "tbUserName"
    }
  },
  "tb_user_detail": {
    "uid": {
      "input": "tb_user_detail.uid",
      "output": "tbUserDetailUid"
    },
    "age": {
      "input": "tb_user_detail.age",
      "output": "tbUserDetailAge"
    }
  }
};

