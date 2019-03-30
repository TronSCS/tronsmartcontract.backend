const solc = require('solc');
var MemoryStream = require('memorystream');
var https = require('https');
var requireFromString = require('require-from-string');

exports.loadVersion = function (version) {
    return new Promise((resolve, reject) => {
        var mem = new MemoryStream(null, { readable: false });
        var url = (version.indexOf("tron") > -1 ? "https://tronsmartcontract.space/tron-solc-bin/" : "https://ethereum.github.io/solc-bin/bin/") + version;
        https.get(url, function (response) {
            if (response.statusCode !== 200) {
                reject(new Error('Error retrieving binary: ' + response.statusMessage));
            } else {
                response.pipe(mem);
                response.on('end', function () {
                    resolve(solc.setupMethods(requireFromString(mem.toString())));
                });
            }
        }).on('error', function (error) {
            reject(error);
        });
    })
}
