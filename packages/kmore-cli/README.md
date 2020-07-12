# [kmore-cli](https://waitingsong.github.io/kmore/)

This is a sub package of [kmore](https://waitingsong.github.io/kmore/).


[![GitHub tag](https://img.shields.io/github/tag/waitingsong/kmore.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![](https://img.shields.io/badge/lang-TypeScript-blue.svg)
[![Node CI](https://github.com/waitingsong/kmore/workflows/Node%20CI/badge.svg)](https://github.com/waitingsong/kmore/actions)


## Installation
```sh
npm i kmore-cli
// or
npm i -g kmore-cli
```

## Usage

### 1. Configuration:
Eit your project `package.json`
```json
{
  "script": {
    "db:gen": "kmore gen --path src/ test/"
  },
}
```

### 2. Generation

```sh
npm run db:gen
```
Files will be created:
- `{src-file-name}.__built-dict.ts`  
  contains variables of database model necessary for running production. 
- `.kmore.ts`  
  contains types of database model for auto-complete help in IDE during code development. 

