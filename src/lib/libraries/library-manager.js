/* eslint-disable no-console */
// eslint-disable require-jsdoc
/**
 * Created by stephenlv on 2020/4/12.
 */

import AdmZip from 'adm-zip';
import path from 'path';

import defaultCostumes from './costumes.json';
import defaultBackdrops from './backdrops.json';
import defaultSprites from './sprites.json';

import defaultBackdropTags from './backdrop-tags';
import defaultSpriteTags from './sprite-tags';
import {remote} from 'electron';

import async from 'async';

const packageIndexFile = 'package-index.json';
const defaultTagFile = 'tag.json';

let customBackdrops = [];
let customCostumes = [];
let customSprites = [];

let customTags = [];

const isElectronEnv = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.indexOf(' electron/') > -1;
};

const getPackageDir = () => {
    if (isElectronEnv()) {
        const app = remote.app;
        return path.resolve(app.getPath('appData'), 'Scratch Desktop/packages');
    }
    // eslint-disable-next-line no-undef
    return __dirname;
};

export const getCostumes = () => [...customCostumes, ...defaultCostumes];

export const getBackdrops = () => [...customBackdrops, ...defaultBackdrops];

export const getSprites = () => [...customSprites, ...defaultSprites];

export const getCostumeTags = () => [...defaultSpriteTags, ...customTags];

export const getBackdropTags = () => [...defaultBackdropTags, ...customTags];

export const getSpriteTags = () => [...defaultSpriteTags, ...customTags];

const loadJsonFromZip = (zipFile, entryName) => {
    const filePath = path.resolve(getPackageDir(), zipFile);
    const zip = new AdmZip(filePath);
    return new Promise((resolve, reject) => {
        zip.readAsTextAsync(entryName, data => {
            if (data) {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            } else {
                reject('no data');
            }
        });
    });
};

const loadArray = (zipFile, entryName) => new Promise(resolve => {
    loadJsonFromZip(zipFile, entryName).then(o => resolve(o))
        .catch(() => resolve([]));
});

const loadObject = (zipFile, entryName) => new Promise(resolve => {
    loadJsonFromZip(zipFile, entryName).then(o => resolve(o))
        .catch(() => resolve(null));
});

export const loadPackageIndex = () => {
    const packageDir = getPackageDir();
    const filePath = path.resolve(packageDir, packageIndexFile);
    console.log(filePath);
    return new Promise(resolve => {
        // eslint-disable-next-line import/no-nodejs-modules
        const fs = require('fs');
        fs.readFile(filePath, 'utf-8', (err, data) => {
            console.log(err, data);
            if (err) {
                resolve([]);
            } else {
                try {
                    const ret = JSON.parse(data);
                    resolve(ret);
                } catch (e) {
                    resolve([]);
                }
            }
        });
    });
};

export const loadLibraries = () => {
    customBackdrops = [];
    customCostumes = [];
    customSprites = [];

    customTags = [];

    return new Promise(resolve => {
        loadPackageIndex().then(l => {
            const loadTags = cb => {
                async.map(l, (item, callback) => {
                    const {fileName, tagFile} = item;
                    loadObject(fileName, tagFile || defaultTagFile).then(tag => {
                        if (tag) {
                            customTags.push(tag);
                        }
                        callback(null, tag);
                    });
                }, () => {
                    cb(null, customTags);
                });
            };

            const loadBackdrops = cb => {
                async.map(l, (item, callback) => {
                    const {fileName, backdropsFile} = item;
                    loadArray(fileName, backdropsFile).then(backdrops => {
                        callback(null, backdrops);
                    });
                }, (_, results) => {
                    results.forEach(backdrops => {
                        customBackdrops.push(...backdrops);
                    });
                    cb(null, customBackdrops);
                });
            };

            const loadCostumes = cb => {
                async.map(l, (item, callback) => {
                    const {fileName, costumesFile} = item;
                    loadArray(fileName, costumesFile).then(costumes => {
                        callback(null, costumes);
                    });
                }, (_, results) => {
                    results.forEach(costumes => {
                        customCostumes.push(...costumes);
                    });
                    cb(null, customCostumes);
                });
            };

            const loadSprites = cb => {
                async.map(l, (item, callback) => {
                    const {fileName, spriteFile} = item;
                    loadArray(fileName, spriteFile).then(sprites => {
                        callback(null, sprites);
                    });
                }, (_, results) => {
                    results.forEach(sprites => {
                        customSprites.push(...sprites);
                    });
                    cb(null, customSprites);
                });
            };

            async.parallel([
                loadTags,
                loadBackdrops,
                loadCostumes,
                loadSprites
            ], (err, results) => {
                console.log(err, results);
                resolve();
            });
        });
    });
};
