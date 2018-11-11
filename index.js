const express = require('express')
const app = express()
const port = 80
const { gitCommitPush } = require("git-commit-push-via-github-api");
app.use(express.json());
app.get('/', (req, res) => res.send('Server running'))
app.post('/shareit', (req, res) => {
    try {
        console.log(req.body.source);
        let fileName = Date.now() + "";
        if (!process.env.GITHUB_API_TOKEN) {
            throw new Error("GITHUB_API_TOKEN=xxx node index.js");
        }
        gitCommitPush({
                // commit to https://github.com/azu/commit-to-github-test
                owner: "TronSCS",
                repo: "tronsmartcontract.shareit",
                // commit files
                files: [
                    { path: fileName+".sol", content: req.body.source },
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
                res.send(JSON.stringify({ result: "FAILED",error:err }))
            });
    }
    catch (e) {
        res.send(JSON.stringify({ result: "ERROR" }))
    }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
