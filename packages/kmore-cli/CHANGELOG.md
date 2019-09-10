# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.11.0 (2019-09-10)


### Bug Fixes

* catch test error ([1f265b6](https://github.com/waitingsong/kmore-cli/commit/1f265b6))
* createDir() path resolve under linux ([2034889](https://github.com/waitingsong/kmore-cli/commit/2034889))
* deps, peerDeps might empty ([ac3bfda](https://github.com/waitingsong/kmore-cli/commit/ac3bfda))
* error TS1345: An expression of type 'void' cannot be tested for truthiness ([b5db3ec](https://github.com/waitingsong/kmore-cli/commit/b5db3ec))
* options not covered within createFile() ([38ff2ed](https://github.com/waitingsong/kmore-cli/commit/38ff2ed))
* path require parse by normalize() within createDir() ([26f8475](https://github.com/waitingsong/kmore-cli/commit/26f8475))
* revert ts-node to '5.0.1' ([103643e](https://github.com/waitingsong/kmore-cli/commit/103643e))
* rimraf() got "no such file or directory" if unlink a file ([61a35c9](https://github.com/waitingsong/kmore-cli/commit/61a35c9))
* rimraf() rm folder ([97cafb5](https://github.com/waitingsong/kmore-cli/commit/97cafb5))
* **tslint:** no-unused-variable rule ([3899d13](https://github.com/waitingsong/kmore-cli/commit/3899d13))
* wrong variable within createFile() ([3bc3831](https://github.com/waitingsong/kmore-cli/commit/3bc3831))


### Features

* **build:** do not build esm.js default ([77a5a8d](https://github.com/waitingsong/kmore-cli/commit/77a5a8d))
* add assertNever() ([4d523b2](https://github.com/waitingsong/kmore-cli/commit/4d523b2))
* add assertNeverObb() ([4f83b0a](https://github.com/waitingsong/kmore-cli/commit/4f83b0a))
* add isPathAcessible() ([04deba3](https://github.com/waitingsong/kmore-cli/commit/04deba3))
* add lib/shared.ts ([934b576](https://github.com/waitingsong/kmore-cli/commit/934b576))
* add logger() ([3c220ef](https://github.com/waitingsong/kmore-cli/commit/3c220ef))
* add Observable functions ([6cf019c](https://github.com/waitingsong/kmore-cli/commit/6cf019c))
* change logger() to accept more args ([551820e](https://github.com/waitingsong/kmore-cli/commit/551820e))
* compile output bundle file without minify ([3cf5224](https://github.com/waitingsong/kmore-cli/commit/3cf5224))
* do isPathAccessible() first within isDirFileExists() ([febad05](https://github.com/waitingsong/kmore-cli/commit/febad05))
* export basename() from shared ([bf430ff](https://github.com/waitingsong/kmore-cli/commit/bf430ff))
* export dirname() ([2bab5f1](https://github.com/waitingsong/kmore-cli/commit/2bab5f1))
* export native assert() ([75ece5a](https://github.com/waitingsong/kmore-cli/commit/75ece5a))
* export os.tmpdir() ([23ea6fe](https://github.com/waitingsong/kmore-cli/commit/23ea6fe))
* export rmdirAsync() and rimraf() ([ac0c286](https://github.com/waitingsong/kmore-cli/commit/ac0c286))
* export statAsync ([d79bcbf](https://github.com/waitingsong/kmore-cli/commit/d79bcbf))
* output esm.min.js ([b92ca5b](https://github.com/waitingsong/kmore-cli/commit/b92ca5b))
* parse peerDependencies as external ([beac32a](https://github.com/waitingsong/kmore-cli/commit/beac32a))
* parseUMDName() ([a461b7f](https://github.com/waitingsong/kmore-cli/commit/a461b7f))
* remove log() and logger() ([1ec4bf2](https://github.com/waitingsong/kmore-cli/commit/1ec4bf2))


### Reverts

* wrong tslib remove ([e7aecb6](https://github.com/waitingsong/kmore-cli/commit/e7aecb6))
