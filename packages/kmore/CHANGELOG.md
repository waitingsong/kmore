# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.11.0 (2019-09-10)


### Bug Fixes

* catch test error ([a8d369f](https://github.com/waitingsong/kmore/commit/a8d369f))
* createDir() path resolve under linux ([62e5a2c](https://github.com/waitingsong/kmore/commit/62e5a2c))
* deps, peerDeps might empty ([e9c7396](https://github.com/waitingsong/kmore/commit/e9c7396))
* error TS1345: An expression of type 'void' cannot be tested for truthiness ([baef865](https://github.com/waitingsong/kmore/commit/baef865))
* options not covered within createFile() ([939c3af](https://github.com/waitingsong/kmore/commit/939c3af))
* path require parse by normalize() within createDir() ([5b2d01c](https://github.com/waitingsong/kmore/commit/5b2d01c))
* revert ts-node to '5.0.1' ([17aee68](https://github.com/waitingsong/kmore/commit/17aee68))
* rimraf() got "no such file or directory" if unlink a file ([b47f2f6](https://github.com/waitingsong/kmore/commit/b47f2f6))
* rimraf() rm folder ([4fc2e1b](https://github.com/waitingsong/kmore/commit/4fc2e1b))
* **tslint:** no-unused-variable rule ([23bec9d](https://github.com/waitingsong/kmore/commit/23bec9d))
* wrong variable within createFile() ([8e29a46](https://github.com/waitingsong/kmore/commit/8e29a46))


### Features

* parameter of tables of kmore() supports value false ([ec2f43f](https://github.com/waitingsong/kmore/commit/ec2f43f))
* **build:** do not build esm.js default ([1645628](https://github.com/waitingsong/kmore/commit/1645628))
* add assertNever() ([268c690](https://github.com/waitingsong/kmore/commit/268c690))
* add assertNeverObb() ([3f90fa4](https://github.com/waitingsong/kmore/commit/3f90fa4))
* add isPathAcessible() ([7a388fb](https://github.com/waitingsong/kmore/commit/7a388fb))
* add lib/shared.ts ([3b8f645](https://github.com/waitingsong/kmore/commit/3b8f645))
* add logger() ([d0a638a](https://github.com/waitingsong/kmore/commit/d0a638a))
* supports BuildSrcOpts['baseDir'] be String ([a45f11b](https://github.com/waitingsong/kmore/commit/a45f11b))
* **types:** change BuildSrcOpts extends Partial<Options> ([35becb0](https://github.com/waitingsong/kmore/commit/35becb0))
* add Observable functions ([2b1fabd](https://github.com/waitingsong/kmore/commit/2b1fabd))
* build tables from ts types ([760b5b7](https://github.com/waitingsong/kmore/commit/760b5b7))
* change logger() to accept more args ([3b7d771](https://github.com/waitingsong/kmore/commit/3b7d771))
* compile output bundle file without minify ([f9f92f2](https://github.com/waitingsong/kmore/commit/f9f92f2))
* do isPathAccessible() first within isDirFileExists() ([ca4b1a2](https://github.com/waitingsong/kmore/commit/ca4b1a2))
* export basename() from shared ([94f6313](https://github.com/waitingsong/kmore/commit/94f6313))
* export dirname() ([9d54af9](https://github.com/waitingsong/kmore/commit/9d54af9))
* export native assert() ([67d33bc](https://github.com/waitingsong/kmore/commit/67d33bc))
* export os.tmpdir() ([c9cec63](https://github.com/waitingsong/kmore/commit/c9cec63))
* export rmdirAsync() and rimraf() ([258ce98](https://github.com/waitingsong/kmore/commit/258ce98))
* export statAsync ([5026a79](https://github.com/waitingsong/kmore/commit/5026a79))
* output esm.min.js ([9e46e0f](https://github.com/waitingsong/kmore/commit/9e46e0f))
* parse peerDependencies as external ([67a9e05](https://github.com/waitingsong/kmore/commit/67a9e05))
* parseUMDName() ([132a274](https://github.com/waitingsong/kmore/commit/132a274))
* remove log() and logger() ([c20e958](https://github.com/waitingsong/kmore/commit/c20e958))


### Reverts

* wrong tslib remove ([55c1ff2](https://github.com/waitingsong/kmore/commit/55c1ff2))





# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.10.0](https://github.com/waitingsong/kmore/compare/v0.9.0...v0.10.0) (2019-08-16)


### Features

* parameter of tables of kmore() supports value false ([fd94c98](https://github.com/waitingsong/kmore/commit/fd94c98))

## [0.9.0](https://github.com/waitingsong/kmore/compare/v0.8.1...v0.9.0) (2019-08-16)

### [0.8.1](https://github.com/waitingsong/kmore/compare/v0.8.0...v0.8.1) (2019-08-16)

## [0.8.0](https://github.com/waitingsong/kmore/compare/v0.7.0...v0.8.0) (2019-08-15)

## [0.7.0](https://github.com/waitingsong/kmore/compare/v0.6.0...v0.7.0) (2019-08-12)

## [0.6.0](https://github.com/waitingsong/kmore/compare/v0.5.0...v0.6.0) (2019-08-12)

## [0.5.0](https://github.com/waitingsong/kmore/compare/v0.4.0...v0.5.0) (2019-08-11)


### Features

* **build:** do not build esm.js default ([ca59ce7](https://github.com/waitingsong/kmore/commit/ca59ce7))

## [0.4.0](https://github.com/waitingsong/kmore/compare/v0.3.0...v0.4.0) (2019-08-11)

## [0.3.0](https://github.com/waitingsong/kmore/compare/v0.2.0...v0.3.0) (2019-08-10)


### Features

* supports BuildSrcOpts['baseDir'] be String ([8ff4f79](https://github.com/waitingsong/kmore/commit/8ff4f79))
* **types:** change BuildSrcOpts extends Partial<Options> ([3919ca8](https://github.com/waitingsong/kmore/commit/3919ca8))

## [0.2.0](https://github.com/waitingsong/kmore/compare/v0.1.0...v0.2.0) (2019-08-10)

## 0.1.0 (2019-08-09)
