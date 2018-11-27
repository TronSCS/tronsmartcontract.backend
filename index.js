const express = require('express')
const app = express()
const cors = require('cors')
const port = 8081
const { gitCommitPush } = require("git-commit-push-via-github-api");
const { verify } = require('./scverify');
app.use(express.json());
app.use(cors())

app.get('/', (req, res) => res.send('Backend of <a href="https://tronsmartcontract.space">https://tronsmartcontract.space</a>'))
app.options('*', cors())
app.post('/shareit', (req, res) => {
    try {
        console.log(req.body.source);
        let fileName = Date.now() + "";
        if (!process.env.GITHUB_API_TOKEN) {
            throw new Error("GITHUB_API_TOKEN=xxx node index.js");
        }
        gitCommitPush({
                owner: "TronSCS",
                repo: "tronsmartcontract.shareit",
                // commit files
                files: [
                    { path: fileName + ".sol", content: req.body.source },
                ],
                fullyQualifiedRef: "heads/master",
                forceUpdate: false, // optional default = false
                commitMessage: "Share code"
            })
            .then(ress => {
                res.send(JSON.stringify({ result: "SUCCESS", fileName: fileName }));
            })
            .catch(err => {
                console.error(err);
                res.send(JSON.stringify({ result: "FAILED", error: err }))
            });
    }
    catch (e) {
        res.send(JSON.stringify({ result: "ERROR" }))
    }
})
app.post('/verify', async (req, res) => {
    try {
        let contractAddress = req.body.address;
        let checkResult = await verify( req.body.mainNet,contractAddress, req.body.source,req.body.contractName, req.body.parameters, req.body.sol, req.body.opmize);
        if (checkResult.result) {
            if (!process.env.GITHUB_API_TOKEN) {
                throw new Error("GITHUB_API_TOKEN=xxx node index.js");
            }
            gitCommitPush({
                    owner: "TronSCS",
                    repo: "tronsmartcontract.verify",
                    // commit files
                    files: [
                        { path: req.body.mainNet?"mainnet":"testnet"+"\/"+contractAddress + "\/source.sol", content: req.body.source },
                        { path: req.body.mainNet?"mainnet":"testnet"+"\/"+contractAddress + "\/info.json", content: JSON.stringify(req.body.info) },
                    ],
                    fullyQualifiedRef: "heads/master",
                    forceUpdate: false, // optional default = false
                    commitMessage: "Verify " + contractAddress
                })
                .then(ress => {
                    res.send(JSON.stringify({ result: "SUCCESS", address: contractAddress }));
                })
                .catch(err => {
                    console.error(err);
                    res.send(JSON.stringify({ result: "FAILED", error: err }))
                });
        }
        else
        {
            res.send(JSON.stringify({ result: "ERROR",error:checkResult.error }))
        }
    }
    catch (e) {
        res.send(JSON.stringify({ result: "ERROR", error:e }))
    }
})
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
